import "./style.css";
import { decryptText, deriveKey, base64ToUint8Array } from "./crypto";
import { checkPasswordPwned } from "./hibp";

type VaultItem = {
  id: string;
  folderId?: string | null;
  encryptedName: string;
  encryptedUsername?: string;
  encryptedPassword?: string;
  encryptedUrl?: string;
  nonce: string;
};

type DecryptedItem = VaultItem & {
  name: string;
  url: string;
  username: string;
  password: string;
};

type Folder = {
  id: string;
  encryptedName: string;
  nonce: string;
  createdAt: string;
  updatedAt: string;
};

type DecryptedFolder = {
  id: string;
  name: string;
};

const app = document.querySelector<HTMLDivElement>("#app")!;

// Global State
let items: VaultItem[] = [];
let folders: DecryptedFolder[] = [];
let selectedFolderId: string = "all";
let derivedKey: CryptoKey | null = null;
let currentDomain: string = "";

async function renderSetup() {
  app.innerHTML = `
    <div class="container animate-in">
      <div class="header">
        <div class="logo">🛡️</div>
        <h1>SafeVault</h1>
        <p>Connexion au coffre</p>
      </div>

      <div class="form">
        <div class="input-group">
          <label>URL de l'API</label>
          <input id="apiUrl" type="text" placeholder="http://localhost:8080/api" value="http://localhost:8080/api" />
        </div>
        <div class="input-group">
          <label>Email</label>
          <input id="email" type="email" placeholder="votre@email.com" />
        </div>
        <div class="input-group">
          <label>Mot de passe maître</label>
          <input id="password" type="password" placeholder="••••••••" />
        </div>
        
        <label class="checkbox-group">
          <input type="checkbox" id="remember" />
          <div class="checkbox-text">
            <span>Rester déverrouillé</span>
            <p id="warn" class="hidden">⚠️ Moins sécurisé : votre clé sera stockée sur cet appareil.</p>
          </div>
        </label>

        <button id="connect" class="btn-primary">
          <span class="btn-text">Déverrouiller</span>
          <div class="loader hidden"></div>
        </button>
      </div>
      <div id="error" class="error hidden"></div>
    </div>
  `;

  const connectBtn = document.querySelector<HTMLButtonElement>("#connect")!;
  const errorDiv = document.querySelector<HTMLDivElement>("#error")!;
  const rememberCheck = document.querySelector<HTMLInputElement>("#remember")!;
  const warnText = document.querySelector<HTMLParagraphElement>("#warn")!;

  rememberCheck.addEventListener("change", () => {
    warnText.classList.toggle("hidden", !rememberCheck.checked);
  });
  
  // Auto-login attempt
  chrome.storage.local.get(["apiUrl", "email", "mp_p"], async (data: any) => {
    if (data.apiUrl) (document.querySelector("#apiUrl") as HTMLInputElement).value = data.apiUrl;
    if (data.email) (document.querySelector("#email") as HTMLInputElement).value = data.email;
    
    if (data.mp_p && data.apiUrl && data.email) {
        (document.querySelector("#password") as HTMLInputElement).value = data.mp_p;
        rememberCheck.checked = true;
        warnText.classList.remove("hidden");
        // Trigger connect automatically
        connectBtn.click();
    }
  });

  connectBtn.addEventListener("click", async () => {
    const apiUrl = (document.querySelector("#apiUrl") as HTMLInputElement).value;
    const email = (document.querySelector("#email") as HTMLInputElement).value;
    const password = (document.querySelector("#password") as HTMLInputElement).value;
    const remember = rememberCheck.checked;
    
    if (!apiUrl || !email || !password) return;

    try {
      connectBtn.classList.add("loading");
      errorDiv.classList.add("hidden");

      const response = await fetch(`${apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) throw new Error("Identifiants incorrects");

      const data = await response.json();
      
      const storageData: any = { apiUrl, email, token: data.token, salt: data.kdfSalt };
      if (remember) {
          storageData.mp_p = password;
      } else {
          await chrome.storage.local.remove("mp_p");
      }
      await chrome.storage.local.set(storageData);
      
      derivedKey = await deriveKey(password, base64ToUint8Array(data.kdfSalt));
      
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.url) {
        try { currentDomain = new URL(tab.url).hostname.replace("www.", ""); } catch { currentDomain = ""; }
      }

      await loadVault(apiUrl, data.token);
    } catch (err: any) {
      errorDiv.textContent = err.message;
      errorDiv.classList.remove("hidden");
    } finally {
      connectBtn.classList.remove("loading");
    }
  });
}

async function loadVault(apiUrl: string, token: string) {
  try {
    const [itemsResponse, foldersResponse] = await Promise.all([
      fetch(`${apiUrl}/vault/items`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${apiUrl}/folders`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ]);

    if (!itemsResponse.ok || !foldersResponse.ok) throw new Error("Session expirée");
    
    items = await itemsResponse.json();
    
    const foldersData: Folder[] = await foldersResponse.json();
    if (derivedKey) {
      folders = (await Promise.all(
        foldersData.map(async (f) => {
          try {
            return {
              id: f.id,
              name: await decryptText(f.encryptedName, f.nonce, derivedKey!),
            } as DecryptedFolder;
          } catch {
            return null;
          }
        })
      )).filter((f): f is DecryptedFolder => f !== null);
    }

    renderVault();
  } catch (err) {
    renderSetup();
  }
}

async function renderVault() {
  const folderOptions = folders.map(f => `<option value="${f.id}">📁 ${f.name}</option>`).join("");

  app.innerHTML = `
    <div class="container animate-in vault-mode">
      <div class="header-compact">
        <div class="logo-small">🛡️</div>
        <div class="search-box">
          <input id="search" type="text" placeholder="Rechercher..." autofocus />
        </div>
        <button id="logout" class="btn-icon">🚪</button>
      </div>
      
      <div class="filter-box">
        <select id="folder-filter">
          <option value="all">📂 Tous les éléments</option>
          <option value="none">📂 Hors dossier</option>
          ${folderOptions}
        </select>
      </div>
      
      <div id="vault-items" class="items-list" style="margin-top: 10px;">
        <div class="loading-state">Déchiffrement...</div>
      </div>
    </div>
  `;

  document.querySelector("#logout")?.addEventListener("click", async () => {
    derivedKey = null;
    await chrome.storage.local.remove("mp_p");
    renderSetup();
  });

  const searchInput = document.querySelector<HTMLInputElement>("#search")!;
  searchInput.addEventListener("input", () => updateItemsList(searchInput.value));

  const folderFilter = document.querySelector<HTMLSelectElement>("#folder-filter")!;
  folderFilter.addEventListener("change", () => {
    selectedFolderId = folderFilter.value;
    updateItemsList(searchInput.value);
  });

  updateItemsList("");
}

async function updateItemsList(query: string) {
  const listDiv = document.querySelector<HTMLDivElement>("#vault-items")!;
  if (!derivedKey) return;

  const decryptedItems = (await Promise.all(
    items.map(async (item) => {
      try {
        return {
          ...item,
          name: await decryptText(item.encryptedName, item.nonce, derivedKey!),
          url: item.encryptedUrl ? await decryptText(item.encryptedUrl, item.nonce, derivedKey!) : "",
          username: item.encryptedUsername ? await decryptText(item.encryptedUsername, item.nonce, derivedKey!) : "",
          password: item.encryptedPassword ? await decryptText(item.encryptedPassword, item.nonce, derivedKey!) : "",
        } as DecryptedItem;
      } catch {
        return null;
      }
    })
  )).filter((i): i is DecryptedItem => i !== null)
    .filter(i => {
      if (selectedFolderId === "all") return true;
      if (selectedFolderId === "none") return !i.folderId;
      return i.folderId === selectedFolderId;
    });

  const suggestions = decryptedItems.filter(i => 
    currentDomain && i.url.toLowerCase().includes(currentDomain.toLowerCase())
  );
  
  const others = decryptedItems.filter(i => 
    !suggestions.includes(i) && 
    (i.name.toLowerCase().includes(query.toLowerCase()) || 
     i.url.toLowerCase().includes(query.toLowerCase()) ||
     i.username.toLowerCase().includes(query.toLowerCase()))
  );

  listDiv.innerHTML = "";

  if (suggestions.length > 0 && !query) {
    const section = document.createElement("div");
    section.className = "section-header";
    section.textContent = "Suggestions pour ce site";
    listDiv.appendChild(section);
    suggestions.forEach(item => listDiv.appendChild(createItemCard(item)));
    
    if (others.length > 0) {
      const allSection = document.createElement("div");
      allSection.className = "section-header mt-4";
      allSection.textContent = "Tous les identifiants";
      listDiv.appendChild(allSection);
    }
  }

  if (others.length === 0 && suggestions.length === 0) {
    listDiv.innerHTML = '<div class="empty-state">Aucun résultat</div>';
  } else {
    others.forEach(item => listDiv.appendChild(createItemCard(item)));
  }

  // Trigger background HIBP checking for all rendered items
  decryptedItems.forEach(checkItemPassword);
}

const pwnedCache: Record<string, number> = {};

async function checkItemPassword(item: DecryptedItem) {
  if (!item.password) return;
  
  if (pwnedCache[item.password] !== undefined) {
    if (pwnedCache[item.password] > 0) {
      showPwnedWarningOnCard(item.id, pwnedCache[item.password]);
    }
    return;
  }

  try {
    const count = await checkPasswordPwned(item.password);
    pwnedCache[item.password] = count;
    if (count > 0) {
      showPwnedWarningOnCard(item.id, count);
    }
  } catch (err) {
    console.error("Erreur check HIBP:", err);
  }
}

function showPwnedWarningOnCard(itemId: string, count: number) {
  const card = document.querySelector(`.item-card[data-id="${itemId}"]`);
  if (!card) return;
  
  if (card.querySelector(".pwned-badge")) return;
  
  const infoDiv = card.querySelector(".item-info");
  if (!infoDiv) return;
  
  const badge = document.createElement("div");
  badge.className = "pwned-badge animate-in";
  badge.innerHTML = `⚠️ Compromis (${count.toLocaleString()} fuites)`;
  infoDiv.appendChild(badge);
}

function createItemCard(item: DecryptedItem) {
  const itemEl = document.createElement("div");
  itemEl.className = "item-card";
  itemEl.setAttribute("data-id", item.id);
  
  let favicon = null;
  try {
      const domain = item.url ? new URL(item.url).hostname : "";
      favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : null;
  } catch {}

  itemEl.innerHTML = `
    <div class="item-icon">
      ${favicon ? `<img src="${favicon}" />` : '🌐'}
    </div>
    <div class="item-info">
      <div class="item-name">${item.name}</div>
      <div class="item-username">${item.username || "Sans identifiant"}</div>
    </div>
    <button class="btn-fill">Remplir</button>
  `;

  itemEl.querySelector(".btn-fill")?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        type: "SAFEVAULT_AUTOFILL",
        username: item.username,
        password: item.password,
      });
      window.close();
    }
  });

  return itemEl;
}

// Start
renderSetup();