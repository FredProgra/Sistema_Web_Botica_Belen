/**
 * Botica Belén - WCAG 2.1 AA Accessibility Module
 * Soporta:
 * - Modo Alto Contraste (ratio > 7:1)
 * - Tamaño de fuente dinámico accesible (A-, Normal, A+)
 * - Navegación visible por teclado (:focus-visible)
 * - Persistencia en localStorage
 */

(function () {
  const FONT_KEY = "botica_font_size";
  const CONTRAST_KEY = "botica_high_contrast";

  let currentFontSize = parseInt(localStorage.getItem(FONT_KEY), 10) || 16;
  let isHighContrast = localStorage.getItem(CONTRAST_KEY) === "true";

  function applySettings() {
    document.documentElement.style.fontSize = `${currentFontSize}px`;
    if (isHighContrast) {
      document.body.classList.add("wcag-high-contrast");
    } else {
      document.body.classList.remove("wcag-high-contrast");
    }
    const contraste = document.getElementById("wcag-contrast-toggle");
    if (contraste) contraste.setAttribute("aria-pressed", String(isHighContrast));
  }

  window.alterarFuente = function (delta) {
    currentFontSize = Math.min(24, Math.max(14, currentFontSize + delta));
    localStorage.setItem(FONT_KEY, currentFontSize);
    applySettings();
  };

  window.restablecerFuente = function () {
    currentFontSize = 16;
    localStorage.setItem(FONT_KEY, currentFontSize);
    applySettings();
  };

  window.cambiarContraste = function () {
    isHighContrast = !isHighContrast;
    localStorage.setItem(CONTRAST_KEY, isHighContrast);
    applySettings();
    document.dispatchEvent(new Event("botica:contraste-cambiado"));
  };

  // Inyectar Barra de Accesibilidad si no existe
  function inyectarBarraAccesibilidad() {
    if (document.getElementById("wcag-toolbar")) return;

    const bar = document.createElement("aside");
    bar.id = "wcag-toolbar";
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Herramientas de Accesibilidad WCAG");
    bar.innerHTML = `
      <div class="wcag-bar-container">
        <span class="wcag-label"><i class="bi bi-universal-access"></i> Accesibilidad:</span>
        <div class="wcag-buttons">
          <button type="button" class="wcag-btn" onclick="alterarFuente(2)" aria-label="Aumentar tamaño de texto" title="Aumentar texto">A+</button>
          <button type="button" class="wcag-btn" onclick="alterarFuente(-2)" aria-label="Disminuir tamaño de texto" title="Disminuir texto">A-</button>
          <button type="button" class="wcag-btn" onclick="restablecerFuente()" aria-label="Restablecer tamaño de texto" title="Tamaño original">100%</button>
          <button type="button" id="wcag-contrast-toggle" class="wcag-btn wcag-contrast-btn" onclick="cambiarContraste()" aria-label="Alternar modo de alto contraste" aria-pressed="false" title="Alto Contraste">
            <i class="bi bi-circle-half"></i> Alto Contraste
          </button>
        </div>
      </div>
    `;

    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.readyState === "loading" && !document.body) {
    document.addEventListener("DOMContentLoaded", () => {
      inyectarBarraAccesibilidad();
      applySettings();
    });
  } else {
    inyectarBarraAccesibilidad();
    applySettings();
  }
})();
