import { apiInitializer } from "discourse/lib/api";

// ============================================
// TOKEN CALCULATOR — yoDEV
// Sidebar link + modal wrapping an iframe.
// No auth, no postMessage: the calculator runs entirely client-side
// inside its own document and needs nothing from Discourse but a theme hint.
// ============================================

const MODAL_ID = "token-calc-modal";
const BTN_CLASS = "token-calc-btn";

// ============================================
// THEME DETECTION
// ============================================

/**
 * Discourse's CSS custom properties do not cross the iframe boundary, so the
 * calculator cannot read the forum's colour scheme. We derive light/dark from
 * the luminance of the rendered background and pass it as a query param.
 * Deliberately framework-agnostic — no reliance on private Discourse APIs.
 */
function detectTheme() {
  try {
    const bg = getComputedStyle(document.body).backgroundColor;
    const m = bg.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return "light";
    const [r, g, b] = m.map(Number);
    // Rec. 601 luma
    const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luma < 0.5 ? "dark" : "light";
  } catch (e) {
    return "light";
  }
}

function calculatorUrl() {
  const base = settings.token_calc_url;
  if (!settings.token_calc_pass_theme) return base;

  try {
    const url = new URL(base, window.location.origin);
    url.searchParams.set("theme", detectTheme());
    return url.toString();
  } catch (e) {
    return base;
  }
}

// ============================================
// MODAL
// ============================================

function showTokenCalcModal() {
  const existing = document.getElementById(MODAL_ID);
  if (existing) {
    existing.remove();
    return;
  }

  const modal = document.createElement("div");
  modal.id = MODAL_ID;
  modal.className = "token-calc-modal";
  modal.innerHTML = `
    <div class="token-calc-modal-backdrop"></div>
    <div class="token-calc-modal-container" role="dialog" aria-modal="true" aria-label="${settings.token_calc_button_text}">
      <div class="token-calc-modal-header">
        <h2>${settings.token_calc_button_text}</h2>
        <button class="token-calc-modal-close" aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      <div class="token-calc-modal-content">
        <iframe src="${calculatorUrl()}" title="${settings.token_calc_button_text}" frameborder="0"></iframe>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => {
    modal.remove();
    document.removeEventListener("keydown", onKey);
  };
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };

  modal.querySelector(".token-calc-modal-backdrop").addEventListener("click", close);
  modal.querySelector(".token-calc-modal-close").addEventListener("click", close);
  document.addEventListener("keydown", onKey);

  requestAnimationFrame(() => modal.classList.add("is-visible"));
}

// ============================================
// SIDEBAR LINK
// ============================================

function buildLink(tag) {
  const el = document.createElement(tag);
  el.className = "sidebar-section-link-wrapper token-calc-wrapper";
  el.innerHTML = `
    <a class="${BTN_CLASS} sidebar-section-link sidebar-row" href="#" title="${settings.token_calc_button_text}">
      <span class="sidebar-section-link-prefix icon">
        <svg class="fa d-icon d-icon-${settings.token_calc_button_icon} svg-icon prefix-icon svg-string" aria-hidden="true"><use href="#${settings.token_calc_button_icon}"></use></svg>
      </span>
      <span class="sidebar-section-link-content-text">${settings.token_calc_button_text}</span>
    </a>
  `;
  el.querySelector("." + BTN_CLASS).addEventListener("click", (e) => {
    e.preventDefault();
    showTokenCalcModal();
  });
  return el;
}

function addDesktopLink() {
  if (document.querySelector(".sidebar-sections ." + BTN_CLASS)) return true;

  const section = document.querySelector("#sidebar-section-content-community");
  if (!section) return false;

  // Appended to the end of the Community section. Intentionally not anchored to
  // any other component's button — position is best-effort, presence is not.
  section.appendChild(buildLink("li"));
  return true;
}

function addMobileLink() {
  if (document.querySelector("." + BTN_CLASS)) return;

  const panel = document.querySelector(".hamburger-panel .menu-panel, .sidebar-hamburger-dropdown");
  if (!panel) return;

  // Never inject into the user menu.
  if (panel.querySelector(".quick-access-panel, .user-menu, [class*='user-menu']")) return;

  const list = panel.querySelector(".panel-body ul") || panel.querySelector(".panel-body");
  if (!list) return;

  const item = buildLink("li");
  if (list.tagName === "UL") {
    list.appendChild(item);
  } else {
    const ul = list.querySelector("ul");
    if (ul) ul.appendChild(item);
  }
}

function addLinks() {
  if (!addDesktopLink()) {
    // The sidebar renders asynchronously. Bounded retries — no infinite loop.
    let tries = 0;
    const retry = setInterval(() => {
      if (addDesktopLink() || ++tries >= 6) clearInterval(retry);
    }, 500);
  }
  addMobileLink();
}

// ============================================
// INIT
// ============================================

export default apiInitializer("1.8.0", (api) => {
  if (!settings.token_calc_show_in_sidebar) return;

  api.onPageChange(() => setTimeout(addLinks, 500));

  document.addEventListener("click", (e) => {
    if (e.target.closest(".hamburger-panel") || e.target.closest(".btn-sidebar-toggle")) {
      setTimeout(addLinks, 300);
    }
  });

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (
          node.nodeType === 1 &&
          (node.classList?.contains("menu-panel") || node.querySelector?.(".menu-panel"))
        ) {
          setTimeout(addLinks, 100);
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(addLinks, 800);
});
