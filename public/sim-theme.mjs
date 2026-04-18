/** Shared light/dark theme for Cropsy simulation pages (localStorage + CSS). */
export const SIM_THEME_STORAGE_KEY = "cropsySimTheme";

export function getSimTheme() {
  try {
    const s = localStorage.getItem(SIM_THEME_STORAGE_KEY);
    if (s === "light" || s === "dark") return s;
  } catch (_) {}
  return "light";
}

function applyDataset(mode) {
  if (mode === "light") document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
}

export function setSimTheme(mode) {
  const m = mode === "light" ? "light" : "dark";
  try {
    localStorage.setItem(SIM_THEME_STORAGE_KEY, m);
  } catch (_) {}
  applyDataset(m);
  window.dispatchEvent(new CustomEvent("cropsy-theme", { detail: m }));
}

function syncThemeButton(btn, mode) {
  if (!btn) return;
  btn.textContent = mode === "light" ? "\u263E" : "\u2600";
  const darkLabel = "Switch to light theme";
  const lightLabel = "Switch to dark theme";
  btn.title = mode === "light" ? lightLabel : darkLabel;
  btn.setAttribute("aria-label", btn.title);
}

/**
 * @param {HTMLButtonElement | null} themeButton
 */
function updateRangeFill(input) {
  if (!input || input.type !== "range") return;
  const lo = Number.parseFloat(input.min);
  const hi = Number.parseFloat(input.max);
  const val = Number.parseFloat(input.value);
  const minV = Number.isFinite(lo) ? lo : 0;
  const maxV = Number.isFinite(hi) ? hi : 100;
  const v = Number.isFinite(val) ? val : minV;
  const pct = maxV === minV ? 0 : ((v - minV) / (maxV - minV)) * 100;
  input.style.setProperty("--range-fill", `${pct}%`);
}

/** WebKit slider fill uses CSS var --range-fill; keep in sync with value (Safari). */
export function initRangeSliderFill(root = document) {
  const list = root.querySelectorAll?.(".row input[type=range]") ?? [];
  list.forEach((input) => {
    updateRangeFill(input);
    input.addEventListener("input", () => updateRangeFill(input));
    input.addEventListener("change", () => updateRangeFill(input));
  });
}

export function initSimTheme(themeButton) {
  const mode = getSimTheme();
  applyDataset(mode);
  syncThemeButton(themeButton, mode);
  themeButton?.addEventListener("click", () => {
    const next = getSimTheme() === "light" ? "dark" : "light";
    setSimTheme(next);
    syncThemeButton(themeButton, next);
  });
  initRangeSliderFill(document);
}
