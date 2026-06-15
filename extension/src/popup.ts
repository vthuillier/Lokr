import "./style.css";
import { decryptText, deriveKey, base64ToUint8Array, encryptText } from "./crypto";
import { checkPasswordPwned } from "./hibp";

type VaultItem = {
  id: string;
  folderId?: string | null;
  encryptedName: string;
  encryptedUsername?: string;
  encryptedPassword?: string;
  encryptedUrl?: string;
  encryptedNotes?: string;
  nonce: string;
};

type DecryptedItem = VaultItem & {
  name: string;
  url: string;
  username: string;
  password: string;
  notes: string;
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
let currentTab: "vault" | "add" | "generator" | "import" = "vault";
let userToken: string = "";
let apiBaseUrl: string = "";

// Password Generator State
let genLength = 16;
let genUpper = true;
let genLower = true;
let genNumbers = true;
let genSymbols = true;

async function renderSetup() {
  app.innerHTML = `
    <div class="container animate-in">
      <div class="header">
        <div class="logo">🛡️</div>
        <h1>Lokr</h1>
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
      <div id="error" class="toast toast-error hidden"></div>
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
      userToken = data.token;
      apiBaseUrl = apiUrl;
      
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
    userToken = token;
    apiBaseUrl = apiUrl;
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

    renderMainLayout();
  } catch (err) {
    renderSetup();
  }
}

function renderMainLayout() {
  app.innerHTML = `
    <div class="container animate-in">
      <!-- Top Navigation Tabs -->
      <nav class="tabs-nav">
        <button id="tab-vault" class="tab-btn ${currentTab === "vault" ? "active" : ""}">Coffre</button>
        <button id="tab-add" class="tab-btn ${currentTab === "add" ? "active" : ""}">Ajouter</button>
        <button id="tab-generator" class="tab-btn ${currentTab === "generator" ? "active" : ""}">Générer</button>
        <button id="tab-import" class="tab-btn ${currentTab === "import" ? "active" : ""}">Importer</button>
      </nav>

      <!-- Active Tab Content Container -->
      <div id="tab-content"></div>
    </div>
  `;

  // Bind Tab Actions
  document.querySelector("#tab-vault")?.addEventListener("click", () => switchTab("vault"));
  document.querySelector("#tab-add")?.addEventListener("click", () => switchTab("add"));
  document.querySelector("#tab-generator")?.addEventListener("click", () => switchTab("generator"));
  document.querySelector("#tab-import")?.addEventListener("click", () => switchTab("import"));

  renderActiveTab();
}

function switchTab(tab: "vault" | "add" | "generator" | "import") {
  currentTab = tab;
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  document.querySelector(`#tab-${tab}`)?.classList.add("active");
  renderActiveTab();
}

function renderActiveTab() {
  const container = document.querySelector("#tab-content")!;
  container.innerHTML = "";

  if (currentTab === "vault") {
    renderVaultTab(container);
  } else if (currentTab === "add") {
    renderAddTab(container);
  } else if (currentTab === "generator") {
    renderGeneratorTab(container);
  } else if (currentTab === "import") {
    renderImportTab(container);
  }
}

// ---------------- TAB 1: VAULT ----------------
function renderVaultTab(parent: Element) {
  const folderOptions = folders.map(f => `<option value="${f.id}">📁 ${f.name}</option>`).join("");

  parent.innerHTML = `
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
    
    <div id="vault-items" class="items-list">
      <div class="loading-state">Déchiffrement...</div>
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
  folderFilter.value = selectedFolderId;
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
          notes: item.encryptedNotes ? await decryptText(item.encryptedNotes, item.nonce, derivedKey!) : "",
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
  badge.innerHTML = `⚠️ Fuite (${count.toLocaleString()})`;
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
        type: "LOKR_AUTOFILL",
        username: item.username,
        password: item.password,
      });
      window.close();
    }
  });

  return itemEl;
}

// ---------------- TAB 2: ADD CREDENTIAL ----------------
async function renderAddTab(parent: Element) {
  // Query active tab URL to prefill
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const tabUrl = tab?.url || "";
  let defaultName = "";
  try {
    if (tabUrl) {
      defaultName = new URL(tabUrl).hostname.replace("www.", "");
      // Capitalize first letter
      defaultName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
    }
  } catch {}

  const folderOptions = folders.map(f => `<option value="${f.id}">${f.name}</option>`).join("");

  parent.innerHTML = `
    <div class="form animate-in" style="gap: 12px; padding: 16px;">
      <div class="input-group">
        <label>Nom</label>
        <input id="add-name" type="text" placeholder="ex: Github" value="${defaultName}" />
      </div>
      <div class="input-group">
        <label>Identifiant</label>
        <input id="add-username" type="text" placeholder="Email ou pseudo" />
      </div>
      <div class="input-group">
        <label>Mot de passe</label>
        <div class="result-box">
          <input id="add-password" type="text" placeholder="Mot de passe" />
          <button id="add-gen-btn" class="btn-copy" style="right: 6px;">⚡</button>
        </div>
      </div>
      <div class="input-group">
        <label>URL du site</label>
        <input id="add-url" type="text" placeholder="https://..." value="${tabUrl}" />
      </div>
      <div class="input-group">
        <label>Dossier</label>
        <select id="add-folder">
          <option value="none">Aucun dossier</option>
          ${folderOptions}
        </select>
      </div>
      <div class="input-group">
        <label>Notes</label>
        <textarea id="add-notes" placeholder="Notes additionnelles..." rows="2" style="resize: none;"></textarea>
      </div>

      <button id="add-save" class="btn-primary" style="margin-top: 6px;">
        <span>Enregistrer</span>
      </button>
      <div id="add-toast" class="toast hidden"></div>
    </div>
  `;

  const addPassInput = document.querySelector<HTMLInputElement>("#add-password")!;
  document.querySelector("#add-gen-btn")?.addEventListener("click", () => {
    addPassInput.value = generateSecurePassword(16, true, true, true, true);
  });

  const saveBtn = document.querySelector<HTMLButtonElement>("#add-save")!;
  const toast = document.querySelector<HTMLDivElement>("#add-toast")!;

  saveBtn.addEventListener("click", async () => {
    const name = document.querySelector<HTMLInputElement>("#add-name")!.value.trim();
    const username = document.querySelector<HTMLInputElement>("#add-username")!.value.trim();
    const password = addPassInput.value.trim();
    const url = document.querySelector<HTMLInputElement>("#add-url")!.value.trim();
    const folderId = document.querySelector<HTMLSelectElement>("#add-folder")!.value;
    const notes = document.querySelector<HTMLTextAreaElement>("#add-notes")!.value.trim();

    if (!name) {
      showToast(toast, "Le nom est requis.", "error");
      return;
    }

    if (!derivedKey) return;

    try {
      saveBtn.disabled = true;
      toast.classList.add("hidden");

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encName = await encryptText(name, derivedKey, iv);
      const encUser = username ? await encryptText(username, derivedKey, iv) : { ciphertext: "", iv: "" };
      const encPass = password ? await encryptText(password, derivedKey, iv) : { ciphertext: "", iv: "" };
      const encUrl = url ? await encryptText(url, derivedKey, iv) : { ciphertext: "", iv: "" };
      const encNotes = notes ? await encryptText(notes, derivedKey, iv) : { ciphertext: "", iv: "" };

      // POST Create Item
      const response = await fetch(`${apiBaseUrl}/vault/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`
        },
        body: JSON.stringify({
          encryptedName: encName.ciphertext,
          encryptedUsername: encUser.ciphertext || null,
          encryptedPassword: encPass.ciphertext || null,
          encryptedUrl: encUrl.ciphertext || null,
          encryptedNotes: encNotes.ciphertext || null,
          nonce: encName.iv,
          groupId: null
        })
      });

      if (!response.ok) throw new Error("Erreur lors de la sauvegarde.");
      const createdItem = await response.json();

      // Move to folder if specified
      if (folderId !== "none") {
        const moveRes = await fetch(`${apiBaseUrl}/folders/items/${createdItem.id}/move`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`
          },
          body: JSON.stringify({ folderId })
        });
        if (!moveRes.ok) console.warn("Impossible de déplacer l'élément dans le dossier.");
      }

      showToast(toast, "Identifiant ajouté avec succès !", "success");
      
      // Reload vault in background
      fetch(`${apiBaseUrl}/vault/items`, {
        headers: { Authorization: `Bearer ${userToken}` },
      }).then(r => r.json()).then(data => { items = data; });

      // Reset form
      document.querySelector<HTMLInputElement>("#add-name")!.value = "";
      document.querySelector<HTMLInputElement>("#add-username")!.value = "";
      addPassInput.value = "";
      document.querySelector<HTMLInputElement>("#add-url")!.value = "";
      document.querySelector<HTMLSelectElement>("#add-folder")!.value = "none";
      document.querySelector<HTMLTextAreaElement>("#add-notes")!.value = "";

    } catch (err: any) {
      showToast(toast, err.message, "error");
    } finally {
      saveBtn.disabled = false;
    }
  });
}

// ---------------- TAB 3: PASSWORD GENERATOR ----------------
function renderGeneratorTab(parent: Element) {
  parent.innerHTML = `
    <div class="generator-card animate-in">
      <div class="result-box">
        <input id="gen-result" type="text" readonly />
        <button id="gen-copy" class="btn-copy">📋</button>
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span>Longueur</span>
          <span id="len-val">${genLength}</span>
        </div>
        <input id="gen-len-slider" type="range" min="8" max="64" value="${genLength}" />
      </div>

      <div class="options-grid">
        <div class="switch-group">
          <span class="switch-label">Majuscules</span>
          <label class="switch">
            <input id="opt-upper" type="checkbox" ${genUpper ? "checked" : ""} />
            <span class="slider-switch"></span>
          </label>
        </div>
        <div class="switch-group">
          <span class="switch-label">Minuscules</span>
          <label class="switch">
            <input id="opt-lower" type="checkbox" ${genLower ? "checked" : ""} />
            <span class="slider-switch"></span>
          </label>
        </div>
        <div class="switch-group">
          <span class="switch-label">Chiffres</span>
          <label class="switch">
            <input id="opt-numbers" type="checkbox" ${genNumbers ? "checked" : ""} />
            <span class="slider-switch"></span>
          </label>
        </div>
        <div class="switch-group">
          <span class="switch-label">Symboles</span>
          <label class="switch">
            <input id="opt-symbols" type="checkbox" ${genSymbols ? "checked" : ""} />
            <span class="slider-switch"></span>
          </label>
        </div>
      </div>

      <button id="gen-trigger" class="btn-primary">
        <span>Générer</span>
      </button>
      <div id="gen-toast" class="toast toast-success hidden">Copié !</div>
    </div>
  `;

  const resultInput = document.querySelector<HTMLInputElement>("#gen-result")!;
  const lenSlider = document.querySelector<HTMLInputElement>("#gen-len-slider")!;
  const lenValSpan = document.querySelector<HTMLSpanElement>("#len-val")!;

  const generate = () => {
    genLength = parseInt(lenSlider.value);
    genUpper = document.querySelector<HTMLInputElement>("#opt-upper")!.checked;
    genLower = document.querySelector<HTMLInputElement>("#opt-lower")!.checked;
    genNumbers = document.querySelector<HTMLInputElement>("#opt-numbers")!.checked;
    genSymbols = document.querySelector<HTMLInputElement>("#opt-symbols")!.checked;
    
    resultInput.value = generateSecurePassword(genLength, genUpper, genLower, genNumbers, genSymbols);
  };

  lenSlider.addEventListener("input", () => {
    lenValSpan.textContent = lenSlider.value;
    generate();
  });

  document.querySelectorAll(".switch input").forEach(el => {
    el.addEventListener("change", generate);
  });

  document.querySelector("#gen-trigger")?.addEventListener("click", generate);

  document.querySelector("#gen-copy")?.addEventListener("click", () => {
    if (!resultInput.value) return;
    navigator.clipboard.writeText(resultInput.value);
    const toast = document.querySelector<HTMLDivElement>("#gen-toast")!;
    toast.classList.remove("hidden");
    setTimeout(() => { toast.classList.add("hidden"); }, 2000);
  });

  generate();
}

function generateSecurePassword(len: number, upper: boolean, lower: boolean, nums: boolean, syms: boolean): string {
  const uppers = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowers = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  let pool = "";
  let guaranteed = [];

  if (upper) {
    pool += uppers;
    guaranteed.push(uppers[Math.floor(Math.random() * uppers.length)]);
  }
  if (lower) {
    pool += lowers;
    guaranteed.push(lowers[Math.floor(Math.random() * lowers.length)]);
  }
  if (nums) {
    pool += numbers;
    guaranteed.push(numbers[Math.floor(Math.random() * numbers.length)]);
  }
  if (syms) {
    pool += symbols;
    guaranteed.push(symbols[Math.floor(Math.random() * symbols.length)]);
  }

  if (!pool) return "";

  const randomValues = new Uint32Array(len);
  window.crypto.getRandomValues(randomValues);

  let password: string[] = [];
  // Use guaranteed characters first to ensure complexity settings are satisfied
  for (let i = 0; i < guaranteed.length; i++) {
    password.push(guaranteed[i]);
  }

  for (let i = password.length; i < len; i++) {
    const idx = randomValues[i] % pool.length;
    password.push(pool[idx]);
  }

  // Shuffle the password
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = password[i];
    password[i] = password[j];
    password[j] = temp;
  }

  return password.join("");
}

// ---------------- TAB 4: BITWARDEN IMPORT ----------------
function renderImportTab(parent: Element) {
  parent.innerHTML = `
    <div class="form animate-in" style="gap: 12px; padding: 18px;">
      <div id="drop-area" class="import-area">
        <div class="import-icon">📥</div>
        <p>Glissez-déposez le fichier .json Bitwarden</p>
        <span>Ou cliquez pour choisir sur votre appareil</span>
        <input type="file" id="file-input" accept=".json" style="display: none;" />
      </div>

      <div id="import-status" class="progress-container hidden">
        <div class="progress-header">
          <span id="import-state-text">Traitement...</span>
          <span id="import-percent">0%</span>
        </div>
        <div class="progress-bar">
          <div id="import-progress-fill" class="progress-fill"></div>
        </div>
      </div>

      <div id="import-toast" class="toast hidden"></div>
    </div>
  `;

  const dropArea = document.querySelector<HTMLDivElement>("#drop-area")!;
  const fileInput = document.querySelector<HTMLInputElement>("#file-input")!;
  const statusContainer = document.querySelector<HTMLDivElement>("#import-status")!;
  const progressFill = document.querySelector<HTMLDivElement>("#import-progress-fill")!;
  const stateText = document.querySelector<HTMLSpanElement>("#import-state-text")!;
  const percentText = document.querySelector<HTMLSpanElement>("#import-percent")!;
  const toast = document.querySelector<HTMLDivElement>("#import-toast")!;

  dropArea.addEventListener("click", () => fileInput.click());

  dropArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropArea.style.borderColor = "var(--primary)";
  });

  dropArea.addEventListener("dragleave", () => {
    dropArea.style.borderColor = "var(--border)";
  });

  dropArea.addEventListener("drop", (e) => {
    e.preventDefault();
    dropArea.style.borderColor = "var(--border)";
    const file = e.dataTransfer?.files?.[0];
    if (file) handleImportFile(file);
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (file) handleImportFile(file);
  });

  async function handleImportFile(file: File) {
    if (!derivedKey) return;
    try {
      toast.classList.add("hidden");
      statusContainer.classList.remove("hidden");
      
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.items || !Array.isArray(data.items)) {
        throw new Error("Format Bitwarden invalide (aucune entrée trouvée).");
      }

      stateText.textContent = "Création des dossiers...";
      percentText.textContent = "0%";
      progressFill.style.width = "0%";

      // 1. Create folders
      const folderIdMap: Record<string, string> = {};
      const bwFolders = data.folders || [];
      const totalFolders = bwFolders.length;

      for (let i = 0; i < totalFolders; i++) {
        const folder = bwFolders[i];
        if (folder.name) {
          const iv = window.crypto.getRandomValues(new Uint8Array(12));
          const encName = await encryptText(folder.name, derivedKey, iv);

          const res = await fetch(`${apiBaseUrl}/folders`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${userToken}`
            },
            body: JSON.stringify({
              encryptedName: encName.ciphertext,
              nonce: encName.iv
            })
          });

          if (res.ok) {
            const folderRes = await res.json();
            folderIdMap[folder.id] = folderRes.id;
          }
        }
        const pct = Math.round(((i + 1) / (totalFolders + data.items.length)) * 50);
        percentText.textContent = `${pct}%`;
        progressFill.style.width = `${pct}%`;
      }

      // 2. Create login items
      stateText.textContent = "Importation des identifiants...";
      const logins = data.items.filter((item: any) => item.type === 1); // 1 = Login item type
      const totalLogins = logins.length;

      for (let i = 0; i < totalLogins; i++) {
        const item = logins[i];
        const name = item.name || "Élément importé";
        const loginData = item.login || {};
        const username = loginData.username || "";
        const password = loginData.password || "";
        const url = (loginData.uris && loginData.uris[0]?.uri) || "";
        const notes = item.notes || "";

        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encName = await encryptText(name, derivedKey, iv);
        const encUser = username ? await encryptText(username, derivedKey, iv) : { ciphertext: "", iv: "" };
        const encPass = password ? await encryptText(password, derivedKey, iv) : { ciphertext: "", iv: "" };
        const encUrl = url ? await encryptText(url, derivedKey, iv) : { ciphertext: "", iv: "" };
        const encNotes = notes ? await encryptText(notes, derivedKey, iv) : { ciphertext: "", iv: "" };

        // Save vault item
        const res = await fetch(`${apiBaseUrl}/vault/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`
          },
          body: JSON.stringify({
            encryptedName: encName.ciphertext,
            encryptedUsername: encUser.ciphertext || null,
            encryptedPassword: encPass.ciphertext || null,
            encryptedUrl: encUrl.ciphertext || null,
            encryptedNotes: encNotes.ciphertext || null,
            nonce: encName.iv,
            groupId: null
          })
        });

        if (res.ok) {
          const createdItem = await res.json();
          // Move to folder if belongs to a mapped folder
          if (item.folderId && folderIdMap[item.folderId]) {
            const newFolderId = folderIdMap[item.folderId];
            await fetch(`${apiBaseUrl}/folders/items/${createdItem.id}/move`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${userToken}`
              },
              body: JSON.stringify({ folderId: newFolderId })
            });
          }
        }

        const pct = Math.round(50 + ((i + 1) / totalLogins) * 50);
        percentText.textContent = `${pct}%`;
        progressFill.style.width = `${pct}%`;
      }

      stateText.textContent = "Terminé !";
      progressFill.style.width = "100%";
      showToast(toast, `Importation réussie : ${totalLogins} identifiants importés.`, "success");

      // Reload vault state
      await loadVault(apiBaseUrl, userToken);
    } catch (err: any) {
      showToast(toast, err.message, "error");
      statusContainer.classList.add("hidden");
    }
  }
}

// ---------------- TOAST UTILS ----------------
function showToast(el: HTMLDivElement, message: string, type: "success" | "error") {
  el.textContent = message;
  el.className = `toast toast-${type} animate-in`;
  setTimeout(() => {
    el.classList.add("hidden");
  }, 4000);
}

// Start
renderSetup();