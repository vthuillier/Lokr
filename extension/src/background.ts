import { decryptText, deriveKey, base64ToUint8Array, encryptText } from "./crypto";

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

type DecryptedItem = {
  id: string;
  name: string;
  username: string;
  password: string;
  url: string;
};

let cachedKey: CryptoKey | null = null;
let cachedToken: string = "";
let cachedApiUrl: string = "";

async function getDecryptionKeyAndToken() {
  const local = await chrome.storage.local.get(["apiUrl", "token", "salt", "mp_p"]) as any;
  
  // Try to get mp_p from session first, then local (remember me)
  let mp_p = "";
  if ((chrome.storage as any).session) {
    const session = await (chrome.storage as any).session.get("mp_p") as any;
    mp_p = session.mp_p || local.mp_p;
  } else {
    mp_p = local.mp_p;
  }

  if (!mp_p || !local.apiUrl || !local.token || !local.salt) {
    throw new Error("Coffre verrouillé ou non configuré");
  }

  if (cachedKey && cachedToken === local.token && cachedApiUrl === local.apiUrl) {
    return { key: cachedKey, token: local.token, apiUrl: local.apiUrl };
  }

  const saltBytes = base64ToUint8Array(local.salt);
  const key = await deriveKey(mp_p, saltBytes);

  cachedKey = key;
  cachedToken = local.token;
  cachedApiUrl = local.apiUrl;

  return { key, token: local.token, apiUrl: local.apiUrl };
}

// Clear cache on storage change (e.g. logout)
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" || areaName === "session") {
    if (changes.token || changes.mp_p) {
      cachedKey = null;
      cachedToken = "";
      cachedApiUrl = "";
    }
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "LOKR_GET_AUTOFILL_DATA") {
    const hostname = message.hostname || "";
    getDecryptionKeyAndToken()
      .then(async ({ key, token, apiUrl }) => {
        const response = await fetch(`${apiUrl}/vault/items`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          throw new Error("Session expirée");
        }

        const items: VaultItem[] = await response.json();
        const decryptedItems = (await Promise.all(
          items.map(async (item) => {
            try {
              const name = await decryptText(item.encryptedName, item.nonce, key);
              const url = item.encryptedUrl ? await decryptText(item.encryptedUrl, item.nonce, key) : "";
              const username = item.encryptedUsername ? await decryptText(item.encryptedUsername, item.nonce, key) : "";
              const password = item.encryptedPassword ? await decryptText(item.encryptedPassword, item.nonce, key) : "";

              return {
                id: item.id,
                name,
                username,
                password,
                url
              } as DecryptedItem;
            } catch (err) {
              return null;
            }
          })
        )).filter((i): i is DecryptedItem => i !== null);

        // Filter suggestions for current site
        const domain = hostname.replace("www.", "").toLowerCase();
        const suggestions = decryptedItems.filter(i => 
          domain && i.url.toLowerCase().includes(domain)
        );

        sendResponse({ locked: false, credentials: suggestions });
      })
      .catch((err) => {
        console.error("[Lokr Background]", err);
        sendResponse({ locked: true, error: err.message });
      });

    return true; // Keep message channel open for async response
  }

  if (message.type === "LOKR_SAVE_GENERATED_CREDENTIAL") {
    const { username, password, url, name } = message;

    getDecryptionKeyAndToken()
      .then(async ({ key, token, apiUrl }) => {
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encName = await encryptText(name, key, iv);
        const encUser = username ? await encryptText(username, key, iv) : { ciphertext: "", iv: "" };
        const encPass = password ? await encryptText(password, key, iv) : { ciphertext: "", iv: "" };
        const encUrl = url ? await encryptText(url, key, iv) : { ciphertext: "", iv: "" };

        const response = await fetch(`${apiUrl}/vault/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            encryptedName: encName.ciphertext,
            encryptedUsername: encUser.ciphertext || null,
            encryptedPassword: encPass.ciphertext || null,
            encryptedUrl: encUrl.ciphertext || null,
            encryptedNotes: null,
            nonce: encName.iv,
            groupId: null
          })
        });

        if (!response.ok) {
          throw new Error("Erreur de sauvegarde");
        }

        const data = await response.json();
        sendResponse({ success: true, item: data });
      })
      .catch((err) => {
        console.error("[Lokr Background] Save error", err);
        sendResponse({ success: false, error: err.message });
      });

    return true; // Keep message channel open for async response
  }
});
