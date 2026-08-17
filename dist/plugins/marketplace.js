(function() {
  'use strict';

  const plugin = {
    id: 'com.replycators.marketplace',
    render,
  };

  function app() { return window.ReplyCatorsApp; }

  /**
   * Render the Marketplace view.
   *
   * Inserts a "Coming Soon" information banner above the plugin card grid so
   * that users understand:
   *   - The Marketplace is under active development
   *   - The cards shown are planned plugins, not installable ones
   *   - Installation is not yet available
   *   - Future releases will introduce plugin distribution
   *
   * The banner uses only --rc-* CSS custom properties so it is fully
   * theme-aware and adapts to every theme including High Contrast modes.
   * Works identically in popup mode (800 px) and side panel mode (fluid width).
   */
  function render() {
    const container = document.getElementById('view-marketplace');
    if (!container) return;

    // ── Coming Soon banner ─────────────────────────────────────────────────
    // Insert once - guard against double-render on repeated navigateTo() calls.
    if (!container.querySelector('.rc-marketplace-banner')) {
      // Find the grid element to insert the banner before it
      const grid = document.getElementById('rc-marketplace-grid');
      const banner = document.createElement('div');
      banner.className = 'rc-marketplace-banner';
      banner.setAttribute('role', 'note');
      banner.setAttribute('aria-label', 'Marketplace status information');
      banner.innerHTML =
        '<div class="rc-marketplace-banner__body">' +
          '<p class="rc-marketplace-banner__title">Marketplace - Under Development</p>' +
          '<p class="rc-marketplace-banner__text">' +
            'The plugins shown below are <strong>planned features</strong>, not currently installable. ' +
            'The Marketplace is under active development - plugin installation, updates, and distribution ' +
            'will be introduced in a future release.' +
          '</p>' +
          '<ul class="rc-marketplace-banner__list" aria-label="Marketplace status details">' +
            '<li>Plugin ideas and descriptions are displayed for preview</li>' +
            '<li>Installation is not yet available</li>' +
            '<li>Distribution infrastructure is planned for a future release</li>' +
          '</ul>' +
        '</div>';
      if (grid) {
        container.insertBefore(banner, grid);
      } else {
        container.appendChild(banner);
      }
    }

    // ── Plugin cards ───────────────────────────────────────────────────────
    const grid = document.getElementById('rc-marketplace-grid');
    if (!grid) return;
    grid.innerHTML = '';
    app().getMarketplacePlugins().forEach(p => {
      const card = document.createElement('div');
      card.className = 'rc-marketplace-card';
      card.setAttribute('aria-label', app().esc(p.name) + ' - ' + p.category + ' (coming soon)');
      const iconHelper = window.ReplyCatorsIconHelper;
      const iconTag = iconHelper ? iconHelper.resolvePluginIconTag(p.icon, 32) : '';
      card.innerHTML =
        '<div class="rc-marketplace-card__icon" aria-hidden="true">' + iconTag + '</div>' +
        '<div class="rc-marketplace-card__meta">' +
          '<div class="rc-marketplace-card__name">' + app().esc(p.name) + '</div>' +
          '<span class="rc-badge rc-badge--category">' + app().esc(p.category) + '</span>' +
        '</div>' +
        '<p class="rc-marketplace-card__desc">' + app().esc(p.desc) + '</p>' +
        '<div class="rc-marketplace-card__footer"><span class="rc-coming-soon" title="Installation not yet available - planned for a future release">Coming Soon</span></div>';
      grid.appendChild(card);
    });
  }

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.Marketplace = plugin;
})();