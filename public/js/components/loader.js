// public/js/components/loader.js

/**
 * Centralized Loading System
 * Every page uses this for consistent loading UX
 * Configure styles in loaderConfig.js
 */

class Loader {

  /**
   * Show loading spinner inside a container element
   * @param {string} elementId - Container element ID
   * @param {string} size - 'sm', 'md', 'lg', 'xl' from LOADER_CONFIG.sizes
   * @param {string} text - Optional loading text (from LOADER_CONFIG.texts)
   */
  static show(elementId, size = 'md', text = '') {
    const container = document.getElementById(elementId);
    if (!container) return;

    const sizePx = LOADER_CONFIG.sizes[size] || LOADER_CONFIG.sizes.md;
    const displayText = text || LOADER_CONFIG.texts.default;

    container.innerHTML = `
      <div class="loader-container" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2rem;gap:1rem;">
        <div class="loader-ring" style="
          width:${sizePx}px;
          height:${sizePx}px;
          border:3px solid ${LOADER_CONFIG.secondaryColor};
          border-top-color:${LOADER_CONFIG.color};
          border-radius:50%;
          animation:loader-spin ${LOADER_CONFIG.speed} linear infinite;
        "></div>
        ${displayText ? `<span class="loader-text" style="color:var(--color-text-secondary);font-size:var(--font-sm);">${displayText}</span>` : ''}
      </div>
    `;
  }

  /**
   * Hide loading and clear container
   * @param {string} elementId - Container element ID
   */
  static hide(elementId) {
    const container = document.getElementById(elementId);
    if (container) {
      container.innerHTML = '';
    }
  }

  /**
   * Show loading state on a button
   * @param {string} buttonId - Button element ID
   * @param {string} text - Loading text (from LOADER_CONFIG.texts)
   */
  static button(buttonId, text = '') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    const displayText = text || LOADER_CONFIG.texts.processing;

    // Store original text for restore
    btn.setAttribute('data-original-text', btn.textContent);
    btn.disabled = true;
    btn.innerHTML = `
      <span class="loader-ring-sm" style="
        display:inline-block;
        width:14px;
        height:14px;
        border:2px solid rgba(255,255,255,0.3);
        border-top-color:white;
        border-radius:50%;
        animation:loader-spin ${LOADER_CONFIG.speed} linear infinite;
        margin-right:6px;
        vertical-align:middle;
      "></span>
      ${displayText}
    `;
  }

  /**
   * Restore button to original state
   * @param {string} buttonId - Button element ID
   * @param {string} customText - Optional custom text (uses stored original if not provided)
   */
  static buttonRestore(buttonId, customText = '') {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.disabled = false;
    const originalText = btn.getAttribute('data-original-text');
    btn.innerHTML = customText || originalText || 'Submit';
    btn.removeAttribute('data-original-text');
  }

  /**
   * Show full-page loading overlay
   * @param {string} text - Loading text
   */
  static fullPage(text = '') {
    const existing = document.getElementById('fullPageLoader');
    if (existing) existing.remove();

    const displayText = text || LOADER_CONFIG.texts.default;

    const overlay = document.createElement('div');
    overlay.id = 'fullPageLoader';
    overlay.style.cssText = `
      position:fixed;inset:0;z-index:9999;
      background:rgba(255,255,255,0.8);
      backdrop-filter:blur(4px);
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
    `;
    overlay.innerHTML = `
      <div style="
        width:${LOADER_CONFIG.sizes.lg}px;
        height:${LOADER_CONFIG.sizes.lg}px;
        border:4px solid ${LOADER_CONFIG.secondaryColor};
        border-top-color:${LOADER_CONFIG.color};
        border-radius:50%;
        animation:loader-spin ${LOADER_CONFIG.speed} linear infinite;
      "></div>
      ${displayText ? `<p style="margin-top:16px;color:var(--color-text-secondary);font-weight:500;">${displayText}</p>` : ''}
    `;
    document.body.appendChild(overlay);
  }

  /**
   * Hide full-page loading overlay
   */
  static fullPageHide() {
    const overlay = document.getElementById('fullPageLoader');
    if (overlay) overlay.remove();
  }

  /**
   * Show skeleton loader in a container
   * @param {string} elementId - Container element ID
   * @param {number} count - Number of skeleton lines (default from config)
   */
  static skeleton(elementId, count = null) {
    const container = document.getElementById(elementId);
    if (!container) return;

    const lineCount = count || LOADER_CONFIG.skeleton.count;
    const height = LOADER_CONFIG.skeleton.height;
    const gap = LOADER_CONFIG.skeleton.gap;
    const color = LOADER_CONFIG.skeleton.color;
    const radius = LOADER_CONFIG.skeleton.borderRadius;

    let html = '';
    for (let i = 0; i < lineCount; i++) {
      const width = i === lineCount - 1 ? '60%' : '100%';
      html += `
        <div class="skeleton-line" style="
          width:${width};
          height:${height};
          background:${color};
          border-radius:${radius};
          margin-bottom:${i < lineCount - 1 ? gap : '0'};
          animation:loader-shimmer 1.5s infinite;
        "></div>
      `;
    }
    container.innerHTML = html;
  }

  /**
   * Auto-load based on placement config
   * @param {string} elementId - Container element ID matching LOADER_CONFIG.placements
   */
  static auto(elementId) {
    const placement = LOADER_CONFIG.placements[elementId];
    if (!placement) {
      this.show(elementId, 'md');
      return;
    }

    if (placement.type === 'skeleton') {
      this.skeleton(elementId, placement.count);
    } else {
      this.show(elementId, placement.size || 'md');
    }
  }
}