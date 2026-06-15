chrome.runtime.onMessage.addListener((message: { type: string; username?: string; password?: string }) => {
  if (message.type !== "LOKR_AUTOFILL") return;

  console.log("[Lokr] Autofill request received");

  const findInput = (selectors: string[]) => {
    for (const selector of selectors) {
      const el = document.querySelector<HTMLInputElement>(selector);
      if (el) return el;
    }
    return null;
  };

  // Improved selectors for username/email
  const usernameInput = findInput([
    'input[autocomplete="username"]',
    'input[autocomplete="email"]',
    'input[name="login"]',
    'input[name="user"]',
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    'input[id*="user" i]',
    'input[id*="email" i]',
    'input[placeholder*="identifiant" i]',
    'input[placeholder*="username" i]',
    'input[placeholder*="email" i]',
    'input[type="text"]' // Fallback
  ]);

  // Improved selectors for password
  const passwordInput = findInput([
    'input[type="password"]',
    'input[autocomplete="current-password"]',
    'input[autocomplete="new-password"]',
    'input[name*="password" i]',
    'input[id*="password" i]'
  ]);

  const fillElement = (el: HTMLInputElement, value: string) => {
    if (!el) return;
    
    el.focus();
    el.value = value;
    
    // Trigger multiple events to satisfy different frameworks (React, Vue, etc.)
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
    el.blur();
  };

  if (usernameInput && message.username) {
    fillElement(usernameInput, message.username);
  }

  if (passwordInput && message.password) {
    fillElement(passwordInput, message.password);
  }
  
  if (!usernameInput && !passwordInput) {
    console.warn("[Lokr] No input fields found for autofill");
  }
});