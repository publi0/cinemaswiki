const siteHeader = document.querySelector<HTMLElement>(".site-header");
const navToggle = document.querySelector<HTMLButtonElement>(".nav-toggle");
const primaryNav = document.querySelector<HTMLElement>(".site-header .nav");
const navToggleLabel = navToggle?.querySelector<HTMLElement>(".visually-hidden");

function setNavigationOpen(open: boolean, restoreFocus = false): void {
  if (!siteHeader || !navToggle || !primaryNav) return;
  siteHeader.dataset.navOpen = String(open);
  navToggle.setAttribute("aria-expanded", String(open));
  if (navToggleLabel) navToggleLabel.textContent = open ? "Fechar navegação" : "Abrir navegação";
  if (restoreFocus && !open) navToggle.focus();
}

if (siteHeader && navToggle && primaryNav) {
  navToggle.addEventListener("click", () => {
    setNavigationOpen(navToggle.getAttribute("aria-expanded") !== "true");
  });

  primaryNav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) setNavigationOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && navToggle.getAttribute("aria-expanded") === "true") {
      setNavigationOpen(false, true);
    }
  });

  window.matchMedia("(min-width: 761px)").addEventListener("change", (event) => {
    if (event.matches) setNavigationOpen(false);
  });
}
