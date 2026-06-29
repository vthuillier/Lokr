// Helper to find related fields (username, password, confirm password)
function findRelatedFields(input: HTMLInputElement): {
  usernameInput: HTMLInputElement | null;
  passwordInput: HTMLInputElement | null;
  confirmPasswordInput: HTMLInputElement | null;
} {
  const form = input.form;
  let usernameInput: HTMLInputElement | null = null;
  let passwordInput: HTMLInputElement | null = null;
  let confirmPasswordInput: HTMLInputElement | null = null;

  if (form) {
    usernameInput = form.querySelector(
      'input[autocomplete="username"], input[autocomplete="email"], input[name="login"], input[name="user"], input[name="username"], input[name="email"], input[type="email"]'
    );
    if (!usernameInput) {
      usernameInput = form.querySelector('input[type="text"]');
    }
    const passwords = Array.from(form.querySelectorAll('input[type="password"]')) as HTMLInputElement[];
    if (passwords.length > 0) {
      passwordInput = passwords[0];
      if (passwords.length > 1) {
        confirmPasswordInput = passwords[1];
      }
    }
  } else {
    const inputs = Array.from(document.querySelectorAll("input"));
    const index = inputs.indexOf(input);
    if (index !== -1) {
      for (let i = index - 1; i >= 0; i--) {
        if (inputs[i].type === "text" || inputs[i].type === "email") {
          usernameInput = inputs[i];
          break;
        }
      }
      if (input.type === "password") {
        passwordInput = input;
        if (index + 1 < inputs.length && inputs[index + 1].type === "password") {
          confirmPasswordInput = inputs[index + 1];
        }
      } else {
        for (let i = index + 1; i < inputs.length; i++) {
          if (inputs[i].type === "password") {
            passwordInput = inputs[i];
            if (i + 1 < inputs.length && inputs[i + 1].type === "password") {
              confirmPasswordInput = inputs[i + 1];
            }
            break;
          }
        }
      }
    }
  }

  return { usernameInput, passwordInput, confirmPasswordInput };
}

// Helper to check if an input is likely a username field
function isUsernameInput(input: HTMLInputElement): boolean {
  const type = input.type.toLowerCase();
  if (type !== "text" && type !== "email") return false;

  const name = (input.name || "").toLowerCase();
  const id = (input.id || "").toLowerCase();
  const placeholder = (input.placeholder || "").toLowerCase();
  const autocomplete = (input.getAttribute("autocomplete") || "").toLowerCase();

  if (autocomplete.includes("username") || autocomplete.includes("email")) return true;
  if (name.includes("username") || name.includes("email") || name.includes("login") || name.includes("user")) return true;
  if (id.includes("username") || id.includes("email") || id.includes("login") || id.includes("user")) return true;
  if (placeholder.includes("username") || placeholder.includes("email") || placeholder.includes("identifiant") || placeholder.includes("login")) return true;

  const form = input.form;
  if (form) {
    const hasPassword = form.querySelector('input[type="password"]') !== null;
    if (hasPassword) {
      const textInputs = Array.from(form.querySelectorAll('input[type="text"], input[type="email"]'));
      if (textInputs[0] === input) return true;
    }
  }

  return false;
}

// Helper to fill input fields triggering framework events
const fillElement = (el: HTMLInputElement, value: string) => {
  if (!el) return;

  el.focus();
  el.value = value;

  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
  el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
  el.blur();
};

function fillCredentials(usernameVal: string, passwordVal: string, targetInput: HTMLInputElement) {
  const fields = findRelatedFields(targetInput);
  if (fields.usernameInput && usernameVal) {
    fillElement(fields.usernameInput, usernameVal);
  }
  if (fields.passwordInput && passwordVal) {
    fillElement(fields.passwordInput, passwordVal);
  }
  if (fields.confirmPasswordInput && passwordVal) {
    fillElement(fields.confirmPasswordInput, passwordVal);
  }
}

// Generate strong password
function generateSecurePassword(): string {
  const length = 16;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  const allChars = uppercase + lowercase + numbers + symbols;
  let password = "";

  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  for (let i = 4; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password.split("").sort(() => 0.5 - Math.random()).join("");
}

// Save generated credential to Lokr
function saveGeneratedCredential(passwordVal: string, targetInput: HTMLInputElement) {
  const fields = findRelatedFields(targetInput);
  let isSaved = false;

  const performSave = (usernameVal: string) => {
    if (isSaved) return;
    isSaved = true;

    chrome.runtime.sendMessage(
      {
        type: "LOKR_SAVE_GENERATED_CREDENTIAL",
        username: usernameVal,
        password: passwordVal,
        url: window.location.href,
        name: window.location.hostname
      },
      (res) => {
        if (res?.success) {
          console.log("[Lokr] Mot de passe généré enregistré dans Lokr !");
        } else {
          console.warn("[Lokr] Échec de l'enregistrement du mot de passe dans Lokr:", res?.error);
          isSaved = false;
        }
      }
    );
  };

  const usernameVal = fields.usernameInput ? fields.usernameInput.value.trim() : "";
  if (usernameVal) {
    performSave(usernameVal);
  } else if (fields.usernameInput) {
    const inputEl = fields.usernameInput;

    const saveOnBlur = () => {
      const val = inputEl.value.trim();
      if (val) {
        performSave(val);
        inputEl.removeEventListener("blur", saveOnBlur);
      }
    };
    inputEl.addEventListener("blur", saveOnBlur);

    const form = inputEl.form;
    if (form) {
      const saveOnSubmit = () => {
        performSave(inputEl.value.trim());
        form.removeEventListener("submit", saveOnSubmit);
      };
      form.addEventListener("submit", saveOnSubmit);
    }

    window.addEventListener("beforeunload", () => {
      performSave(inputEl.value.trim());
    });
  } else {
    performSave("");
  }
}

// UI Suggestion Dropdown with Shadow DOM
let overlayHost: HTMLDivElement | null = null;
let overlayShadow: ShadowRoot | null = null;
let activeInput: HTMLInputElement | null = null;

function hideOverlay() {
  if (overlayHost) {
    overlayHost.style.display = "none";
  }
  activeInput = null;
}

function showOverlay(input: HTMLInputElement, credentials: any[], isPassword: boolean) {
  activeInput = input;

  if (!overlayHost) {
    overlayHost = document.createElement("div");
    overlayHost.style.position = "absolute";
    overlayHost.style.zIndex = "2147483647";
    overlayHost.style.pointerEvents = "none";
    document.body.appendChild(overlayHost);

    overlayShadow = overlayHost.attachShadow({ mode: "open" });
  }

  // Position overlay
  repositionOverlay();
  overlayHost.style.display = "block";

  // Build content and styles
  const style = `
    .lokr-card {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      padding: 6px;
      width: 280px;
      box-sizing: border-box;
      max-height: 250px;
      overflow-y: auto;
      pointer-events: auto;
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .lokr-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 700;
      color: #4f46e5;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid #f3f4f6;
      margin-bottom: 4px;
    }
    .lokr-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      color: #374151;
      font-size: 13px;
      transition: background-color 0.15s ease, color 0.15s ease;
      user-select: none;
    }
    .lokr-item:hover {
      background-color: #f3f4f6;
      color: #111827;
    }
    .lokr-item-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .lokr-icon {
      font-size: 14px;
      flex-shrink: 0;
    }
    .lokr-username {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .lokr-action {
      font-size: 10px;
      font-weight: 600;
      color: #4f46e5;
      background: #eeebff;
      padding: 2px 6px;
      border-radius: 4px;
      white-shrink: 0;
    }
    .lokr-divider {
      height: 1px;
      background-color: #f3f4f6;
      margin: 4px 0;
    }
    .lokr-generator {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border-radius: 8px;
      cursor: pointer;
      color: #4f46e5;
      font-weight: 600;
      font-size: 12px;
      transition: background-color 0.15s ease;
      user-select: none;
    }
    .lokr-generator:hover {
      background-color: #f3f4f6;
    }
  `;

  let html = `<style>${style}</style><div class="lokr-card">`;
  html += `<div class="lokr-header">🛡️ Lokr</div>`;

  if (credentials.length > 0) {
    credentials.forEach((cred, i) => {
      html += `
        <div class="lokr-item" data-index="${i}">
          <div class="lokr-item-left">
            <span class="lokr-icon">🔑</span>
            <span class="lokr-username">${cred.username || "Sans identifiant"}</span>
          </div>
          <span class="lokr-action">Remplir</span>
        </div>
      `;
    });
  } else if (!isPassword) {
    html += `<div style="padding: 8px 10px; font-size: 12px; color: #6b7280; font-style: italic;">Aucun identifiant trouvé</div>`;
  }

  if (isPassword) {
    if (credentials.length > 0) {
      html += `<div class="lokr-divider"></div>`;
    }
    html += `
      <div class="lokr-generator">
        <span class="lokr-icon">✨</span>
        <span>Générer un mot de passe sécurisé</span>
      </div>
    `;
  }

  html += `</div>`;
  overlayShadow!.innerHTML = html;

  // Bind clicks
  const items = overlayShadow!.querySelectorAll(".lokr-item");
  items.forEach((item) => {
    item.addEventListener("click", () => {
      const idx = parseInt(item.getAttribute("data-index") || "0", 10);
      const cred = credentials[idx];
      fillCredentials(cred.username, cred.password, input);
      hideOverlay();
    });
  });

  const generator = overlayShadow!.querySelector(".lokr-generator");
  if (generator) {
    generator.addEventListener("click", () => {
      const generated = generateSecurePassword();
      fillElement(input, generated);
      
      // Also fill confirm password if present
      const fields = findRelatedFields(input);
      if (fields.confirmPasswordInput) {
        fillElement(fields.confirmPasswordInput, generated);
      }

      saveGeneratedCredential(generated, input);
      hideOverlay();
    });
  }
}

function repositionOverlay() {
  if (!overlayHost || !activeInput || overlayHost.style.display === "none") return;
  const rect = activeInput.getBoundingClientRect();
  overlayHost.style.top = `${rect.bottom + window.scrollY + 6}px`;
  overlayHost.style.left = `${rect.left + window.scrollX}px`;
}

// Listeners for focus
document.addEventListener("focusin", (event) => {
  const target = event.target as HTMLInputElement;
  if (!target || target.tagName !== "INPUT") return;

  const isPassword = target.type === "password" || target.name?.toLowerCase().includes("password") || target.id?.toLowerCase().includes("password");
  const isUsername = isUsernameInput(target);

  if (isPassword || isUsername) {
    chrome.runtime.sendMessage(
      { type: "LOKR_GET_AUTOFILL_DATA", hostname: window.location.hostname },
      (response) => {
        if (chrome.runtime.lastError) return; // extension context invalidated or background sleep
        if (response && !response.locked) {
          showOverlay(target, response.credentials || [], isPassword);
        }
      }
    );
  }
});

// Listeners to close dropdown
document.addEventListener("mousedown", (event) => {
  if (!overlayHost || overlayHost.style.display === "none") return;

  const target = event.target as HTMLElement;
  if (target === activeInput) return;

  const path = event.composedPath();
  if (path.includes(overlayHost)) return;

  hideOverlay();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    hideOverlay();
  }
});

// Reposition on scroll and resize
window.addEventListener("scroll", repositionOverlay, { capture: true, passive: true });
window.addEventListener("resize", repositionOverlay, { passive: true });

// Listen for Autofill messages from Popup
chrome.runtime.onMessage.addListener((message: { type: string; username?: string; password?: string }) => {
  if (message.type !== "LOKR_AUTOFILL") return;

  console.log("[Lokr] Autofill request received");

  const activeEl = document.activeElement as HTMLInputElement;
  const targetInput = activeEl && activeEl.tagName === "INPUT" ? activeEl : document.querySelector("input");
  
  if (targetInput) {
    fillCredentials(message.username || "", message.password || "", targetInput);
  }
});