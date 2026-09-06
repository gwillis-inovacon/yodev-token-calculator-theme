import { apiInitializer } from "discourse/lib/api";

// ============================================
// TOKEN CALCULATOR — yoDEV
// Sidebar link + modal wrapping an iframe.
// No auth, no postMessage: the calculator runs entirely client-side
// inside its own document and needs nothing from Discourse but a theme hint.
// ============================================

const MODAL_ID = "token-calc-modal";
const ITEM_NAME = "token-calculator";

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
// INIT
// ============================================

export default apiInitializer("1.8.0", (api) => {
  if (!settings.token_calc_show_in_sidebar) return;

  // Registered through the sidebar API, matching the Workplace and worX links
  // in discourse-affine-sidebar. An earlier version injected an <li> into the
  // rendered DOM instead, which put the link in Discourse's overflow bucket —
  // the collapsed "más…" at the foot of the Community section. Position is
  // then set with CSS `order` (see common.scss).
  //
  // href is the real URL rather than "#": middle-click and open-in-new-tab
  // still do the sensible thing, and the click handler below takes over the
  // plain left-click to open the modal instead.
  api.addCommunitySectionLink({
    name: ITEM_NAME,
    href: settings.token_calc_url,
    title: settings.token_calc_button_text,
    text: settings.token_calc_button_text,
    icon: settings.token_calc_button_icon,
  });

  // Delegated: survives every sidebar re-render without observers or retries.
  document.addEventListener("click", (e) => {
    const link = e.target.closest(`[data-list-item-name="${ITEM_NAME}"] a`);
    if (!link) return;
    // Leave modified clicks alone — those mean "open it somewhere else".
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    showTokenCalcModal();
  });
});
