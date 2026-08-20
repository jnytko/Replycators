(function() {
  'use strict';

  // ─── Documentation Plugin ────────────────────────────────────────────────────
  //
  // Provides an in-extension Help & Documentation view accessible from the
  // Platform sidebar section.  All content is self-contained with no network
  // requests required.  Navigation is grouped into five sections with expandable
  // groups (max 2 levels).  A search input filters topics by label or keywords.
  //
  // Navigation groups:
  //   GET STARTED    - Getting Started
  //   CORE FEATURES  - Dashboard, Notifications Center (Notifications / Activity),
  //                    Maintenance Center (Diagnostics / Backup & Restore),
  //                    Plugin Manager, Marketplace, Settings, Send Feedback
  //   PLUGINS        - all 9 first-party plugins
  //   PLUGIN DEV     - Example Plugin, Plugin SDK, AI Plugin Kit
  //   SUPPORT        - Troubleshooting, Release Notes
  //
  // Topics: 22

  const PLUGIN_ID = 'com.replycators.documentation';

  function app() { return window.ReplyCatorsApp; }

  // ── Icon helper ─────────────────────────────────────────────────────────────
  function _iconImg(semanticId, size) {
    const h = window.ReplyCatorsIconHelper;
    return h ? h.iconImgTag(semanticId, size || 16) : '';
  }

  // ── Navigation groups ───────────────────────────────────────────────────────

  const NAV_GROUPS = [
    {
      id: 'get-started',
      label: 'Get Started',
      topics: [
        { id: 'getting-started', label: 'Getting Started', semanticId: 'documentation.gettingStarted', keywords: 'install open popup side panel first steps' },
      ],
    },
    {
      id: 'core-features',
      label: 'Core Features',
      topics: [
        { id: 'dashboard',            label: 'Dashboard',             semanticId: 'navigation.home',         keywords: 'widgets quick actions stat cards' },
        { id: 'notifications-center', label: 'Notifications Center',  semanticId: 'navigation.notifications', keywords: 'activity log alerts toasts badge unread' },
        { id: 'maintenance-center',   label: 'Maintenance Center',    semanticId: 'utility.toolbox',         keywords: 'diagnostics preflight health checks cache storage backup restore export import' },
        { id: 'plugin-manager',       label: 'Plugin Manager',        semanticId: 'navigation.plugins',      keywords: 'enable disable reorder filter toggle' },
        { id: 'marketplace',          label: 'Marketplace',           semanticId: 'navigation.marketplace',  keywords: 'planned catalog preview' },
        { id: 'settings',             label: 'Settings',              semanticId: 'navigation.settings',     keywords: 'theme font density accessibility notifications logging launch mode' },
        { id: 'send-feedback',        label: 'Send Feedback',         semanticId: 'utility.sendFeedback',    keywords: 'email mailto jakub marcin draft recipients' },
      ],
    },
    {
      id: 'plugins',
      label: 'Plugins',
      topics: [
        { id: 'salesforce',         label: 'Salesforce Case Extractor',         semanticId: 'plugins.salesforceCaseExtractor',      keywords: 'sf extract case prompt execute bob' },
        { id: 'cloudability-orgid', label: 'Cloudability OrgID',                semanticId: 'plugins.cloudabilityOrgId',             keywords: 'orgid org id cloud refresh cache' },
        { id: 'env-dashboards',     label: 'Environment Dashboards Launcher',   semanticId: 'plugins.envDashboards',                 keywords: 'splunk grafana dashboard environment akp cluster namespace region monitoring' },
        { id: 'workspace-starter',  label: 'Workspace Starter',                 semanticId: 'plugins.workspaceStarter',              keywords: 'workspace profile launch tabs url group' },
        { id: 'tab-search',         label: 'Tab Search',                        semanticId: 'plugins.tabSearch',                     keywords: 'tabs search browser window duplicate' },
        { id: 'apptio-docs-finder', label: 'Apptio Documentation Finder',       semanticId: 'plugins.apptioDocsFinder',              keywords: 'ibm docs search apptio cloudability targetprocess' },
        { id: 'apptio-calculator',             label: 'Apptio Planning Upgrade Calculator', semanticId: 'plugins.apptioUpgradeCalculator',    keywords: 'upgrade date schedule apptio planning' },
        { id: 'bookmark-finder',               label: 'Edge Bookmark Finder',               semanticId: 'plugins.edgeBookmarkFinder',         keywords: 'bookmark edge search folder duplicate analytics' },
        { id: 'snake',              label: 'Snake',                             semanticId: 'plugins.snake',                         keywords: 'game arcade retro score speed' },
      ],
    },
    {
      id: 'plugin-dev',
      label: 'Plugin Development',
      topics: [
        { id: 'example-plugin',     label: 'Example Plugin',                    semanticId: 'plugins.examplePlugin',                 keywords: 'sdk template baseline lifecycle init render' },
        { id: 'plugin-sdk',         label: 'Plugin SDK',                        semanticId: 'documentation.gettingStarted',          keywords: 'sdk standards create plugin architecture' },
      ],
    },
    {
      id: 'support',
      label: 'Support',
      topics: [
        { id: 'troubleshooting',    label: 'Troubleshooting',                   semanticId: 'navigation.diagnostics',                keywords: 'error blank disabled fix salesforce cloudability' },
        { id: 'release-notes',      label: 'Release Notes',                     semanticId: 'navigation.activity',                   keywords: 'changelog version history' },
      ],
    },
  ];

  // Flat topic list for search and direct ID lookups
  const TOPICS_FLAT = NAV_GROUPS.flatMap(g => g.topics);

  let activeTopic     = 'getting-started';
  let searchQuery     = '';
  // Track expanded state per group (all expanded by default)
  const groupExpanded = {};
  NAV_GROUPS.forEach(g => { groupExpanded[g.id] = true; });

  // ── Content registry ────────────────────────────────────────────────────────

  function getContent(topicId) {
    const fn = CONTENT_MAP[topicId];
    return fn ? fn() : CONTENT_MAP['getting-started']();
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  function render() {
    const container = document.getElementById('rc-docs-container');
    if (!container) return;

    if (!container.querySelector('.rc-docs-layout')) {
      container.innerHTML = buildLayout();
      bindNav(container);
      bindSearch(container);
    }

    showTopic(activeTopic, container);
  }

  // ── Layout builder ──────────────────────────────────────────────────────────

  function buildLayout() {
    const navHtml = buildNavHtml('');

    return `
      <div class="rc-docs-layout" role="region" aria-label="Help and Documentation">
        <nav class="rc-docs-nav" aria-label="Documentation topics">
          <div class="rc-docs-nav__header">
            <span class="rc-docs-nav__title">Help &amp; Docs</span>
          </div>
          <div class="rc-docs-nav__search-wrap">
            <input
              id="rc-docs-search"
              class="rc-docs-search"
              type="search"
              placeholder="Search topics…"
              aria-label="Search documentation topics"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <div class="rc-docs-nav__groups" id="rc-docs-nav-groups" role="list">
            ${navHtml}
          </div>
        </nav>
        <main class="rc-docs-content" id="rc-docs-content" role="main" tabindex="-1">
          <div class="rc-docs-body" id="rc-docs-body"></div>
        </main>
      </div>`;
  }

  // Build nav HTML; pass a non-empty filter string to show only matching topics
  function buildNavHtml(filter) {
    const q = filter.toLowerCase().trim();

    return NAV_GROUPS.map(group => {
      const matchingTopics = group.topics.filter(t => {
        if (!q) return true;
        return t.label.toLowerCase().includes(q) || (t.keywords || '').toLowerCase().includes(q);
      });

      if (q && !matchingTopics.length) return '';

      const isExpanded = q ? true : groupExpanded[group.id];
      const topicsHtml = matchingTopics.map(t => {
        const isActive = t.id === activeTopic ? ' rc-docs-nav__item--active' : '';
        const icon = _iconImg(t.semanticId, 14);
        return `<button
          class="rc-docs-nav__item${isActive}"
          data-topic="${esc(t.id)}"
          role="listitem"
          title="${esc(t.label)}"
          aria-current="${t.id === activeTopic ? 'page' : 'false'}"
        ><span class="rc-docs-nav__icon" aria-hidden="true">${icon}</span
        ><span class="rc-docs-nav__label">${esc(t.label)}</span
        ></button>`;
      }).join('');

      return `<div class="rc-docs-nav__group" data-group="${esc(group.id)}" role="listitem">
        <button
          class="rc-docs-nav__group-header"
          data-group-toggle="${esc(group.id)}"
          aria-expanded="${isExpanded ? 'true' : 'false'}"
          aria-controls="rc-docs-group-items-${esc(group.id)}"
        >
          <span class="rc-docs-nav__group-label">${esc(group.label)}</span>
          <span class="rc-docs-nav__group-chevron" aria-hidden="true">${isExpanded ? '▾' : '▸'}</span>
        </button>
        <div
          class="rc-docs-nav__group-items${isExpanded ? '' : ' rc-docs-nav__group-items--collapsed'}"
          id="rc-docs-group-items-${esc(group.id)}"
          role="list"
        >${topicsHtml}</div>
      </div>`;
    }).join('');
  }

  // ── Event binding ────────────────────────────────────────────────────────────

  // Use attribute selector instead of CSS.escape() - the latter is absent in
  // some Edge extension sandbox environments and causes silent toggle failures.
  function _groupItemsEl(container, groupId) {
    return container.querySelector('[id="rc-docs-group-items-' + groupId + '"]');
  }

  function bindNav(container) {
    container.addEventListener('click', function(e) {
      // Topic button
      var topicBtn = e.target.closest('.rc-docs-nav__item[data-topic]');
      if (topicBtn) {
        activeTopic = topicBtn.dataset.topic;
        refreshNavActiveState(container);
        showTopic(activeTopic, container);
        var contentEl = container.querySelector('#rc-docs-content');
        if (contentEl) contentEl.focus();
        return;
      }

      // Group toggle
      var groupToggle = e.target.closest('[data-group-toggle]');
      if (groupToggle) {
        var groupId = groupToggle.dataset.groupToggle;
        groupExpanded[groupId] = !groupExpanded[groupId];
        var items = _groupItemsEl(container, groupId);
        if (items) {
          items.classList.toggle('rc-docs-nav__group-items--collapsed', !groupExpanded[groupId]);
        }
        groupToggle.setAttribute('aria-expanded', groupExpanded[groupId] ? 'true' : 'false');
        var chevron = groupToggle.querySelector('.rc-docs-nav__group-chevron');
        if (chevron) chevron.textContent = groupExpanded[groupId] ? '▾' : '▸';
      }
    });
  }

  function bindSearch(container) {
    const input = container.querySelector('#rc-docs-search');
    if (!input) return;

    input.addEventListener('input', () => {
      searchQuery = input.value;
      const groupsEl = container.querySelector('#rc-docs-nav-groups');
      if (groupsEl) {
        groupsEl.innerHTML = buildNavHtml(searchQuery);
      }
      // Re-sync active state after rebuilding
      refreshNavActiveState(container);
    });

    // Clear search on Escape
    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        input.value = '';
        searchQuery = '';
        const groupsEl = container.querySelector('#rc-docs-nav-groups');
        if (groupsEl) groupsEl.innerHTML = buildNavHtml('');
        refreshNavActiveState(container);
      }
    });
  }

  function refreshNavActiveState(container) {
    container.querySelectorAll('.rc-docs-nav__item[data-topic]').forEach(btn => {
      const isActive = btn.dataset.topic === activeTopic;
      btn.classList.toggle('rc-docs-nav__item--active', isActive);
      btn.setAttribute('aria-current', isActive ? 'page' : 'false');
    });
  }

  function showTopic(topicId, container) {
    const body = container.querySelector('#rc-docs-body');
    if (body) {
      body.innerHTML = getContent(topicId);
      body.scrollTop = 0;
    }
  }

  // ── HTML helpers ─────────────────────────────────────────────────────────────

  function esc(s) {
    return app()?.esc
      ? app().esc(s)
      : String(s)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
  }

  function h2(text) { return `<h2 class="rc-docs-h2">${text}</h2>`; }
  function h3(text) { return `<h3 class="rc-docs-h3">${text}</h3>`; }
  function p(text)  { return `<p class="rc-docs-p">${text}</p>`; }

  function infoBox(semanticId, title, body) {
    const icon = _iconImg(semanticId, 16);
    return `<div class="rc-docs-info-box">
      <span class="rc-docs-info-box__icon" aria-hidden="true">${icon}</span>
      <div>
        <strong class="rc-docs-info-box__title">${title}</strong>
        <p class="rc-docs-info-box__body">${body}</p>
      </div>
    </div>`;
  }

  function table(headers, rows) {
    const thead = `<thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead>`;
    const tbody = `<tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>`;
    return `<div class="rc-docs-table-wrap" role="region" aria-label="Table"><table class="rc-docs-table">${thead}${tbody}</table></div>`;
  }

  function ul(items) {
    return `<ul class="rc-docs-ul">${items.map(i => `<li>${i}</li>`).join('')}</ul>`;
  }

  function badge(text, color) {
    return `<span class="rc-badge rc-badge--${color || 'blue'}">${text}</span>`;
  }

  // ── Content map ──────────────────────────────────────────────────────────────

  const CONTENT_MAP = {

    // ─── GET STARTED ───────────────────────────────────────────────────────────

    'getting-started': () => `
      ${h2('Getting Started with ReplyCators')}
      ${p('ReplyCators is a plugin-based Microsoft Edge extension for support engineers and enterprise power users. It runs entirely in your browser - no sign-in required, no data leaves your machine.')}

      ${infoBox('navigation.home', 'Opening ReplyCators', 'Click the ReplyCators icon in the Edge toolbar to open the extension as a popup. Use the <strong>Side Panel</strong> button in the top-right corner of the extension to pin it as a persistent panel that stays open while you browse.')}

      ${h3('Platform Views')}
      ${table(
        ['View', 'Where to find it', 'What it does'],
        [
          ['Dashboard',            'Top of sidebar',              'Live overview of all plugins, quick actions, and stat cards'],
          ['Notifications Center', 'Bell icon in sidebar (Utility)', 'Notification history and Activity log'],
          ['Maintenance Center',   'Toolbox icon in sidebar (Utility)', 'Platform Diagnostics and Backup &amp; Restore - administration in one tabbed view'],
          ['Plugin Manager',       'Sidebar → Plugins section',   'Enable, disable, reorder, and filter installed plugins'],
          ['Marketplace',          'Sidebar → Plugins section',   'Preview catalog of planned plugins (not yet installable)'],
          ['Settings',             'Sidebar → Utility section',   'Appearance, accessibility, notifications, logging, and plugin settings'],
          ['Send Feedback',        'Sidebar → Utility section',   'Prepare a feedback email draft to the development team'],
          ['Documentation',        'Sidebar → Utility section',   'This help guide (you are here)'],
        ]
      )}

      ${h3('First Steps')}
      ${ul([
        'Click the ReplyCators icon - you land on the <strong>Dashboard</strong>.',
        'Click any plugin widget card to open that plugin\'s full view.',
        'Use the sidebar search box to find a plugin by name.',
        'Go to <strong>Settings</strong> to choose your theme, font, and density.',
        'Go to <strong>Plugin Manager</strong> to enable or disable individual plugins.',
      ])}

      ${h3('Popup vs. Side Panel')}
      ${p('ReplyCators works in two surfaces:')}
      ${ul([
        '<strong>Popup</strong> - opens as a floating overlay when you click the toolbar icon. Closes when focus moves away.',
        '<strong>Side Panel</strong> - stays visible alongside your browsing. Click the Side Panel button (top-right) to switch.',
      ])}
      ${p('Both surfaces share the same state and settings. Switching surfaces does not lose your work. Set the default in <strong>Settings → Extension Behavior → Default Launch Mode</strong>.')}
    `,

    // ─── CORE FEATURES ────────────────────────────────────────────────────────

    'dashboard': () => `
      ${h2('Dashboard')}
      ${p('The Dashboard is the home view shown when you open ReplyCators. It provides a live overview of all installed plugins and one-click shortcuts.')}

      ${h3('Quick Actions')}
      ${p('The Quick Actions grid at the top of the Dashboard provides one-click buttons to the most commonly used plugin views. Each enabled plugin contributes a quick-action card. Disabled plugins do not appear here.')}

      ${h3('Plugin Widget Cards')}
      ${p('Each enabled plugin shows a widget card with:')}
      ${ul([
        'Live status information (for example: detected Salesforce case number, current Cloudability OrgID, Snake high score)',
        'A primary action button for the most common workflow',
        'An open button (top-right of the card) to navigate to the full plugin view',
      ])}
      ${p('To rearrange widget cards, go to <strong>Plugin Manager</strong> and use the <strong>Move Up / Move Down</strong> controls on each plugin row.')}
      ${p('To hide all widget cards, go to <strong>Settings → Dashboard Preferences → Show Plugin Cards</strong> and toggle it off.')}

      ${h3('Platform Status')}
      ${table(
        ['Stat card', 'Description'],
        [
          ['Total Plugins', 'Total number of registered plugins'],
          ['Active',         'Plugins that are currently enabled'],
          ['Inactive',       'Plugins that are installed but disabled'],
          ['Errors',         'Plugins that encountered a load or execution error'],
        ]
      )}

      ${infoBox('navigation.settings', 'Remember Last View', 'Enable <strong>Settings → Dashboard Preferences → Remember Last Opened View</strong> to have ReplyCators reopen to the last view you were on instead of always returning to the Dashboard.')}
    `,

    'notifications-center': () => `
      ${h2('Notifications Center')}
      ${p('The Notifications Center is accessible from the bell icon in the sidebar Utility section. It contains two tabs: <strong>Notifications</strong> and <strong>Activity</strong>.')}

      ${infoBox('navigation.notifications', 'Unread Badge', 'A numeric badge on the bell sidebar button shows the count of unread notifications. The badge disappears when you open Notifications Center - all entries are marked read on view.')}

      ${h3('Notifications Tab (default)')}
      ${p('The Notifications tab shows a history of up to <strong>100</strong> platform and plugin alerts. Entries are newest-first and show:')}
      ${ul([
        '<strong>Icon</strong> - colour-coded by type: green = success, amber = warning, red = error, blue = info',
        '<strong>Title</strong> - short summary of the event',
        '<strong>Source</strong> - plugin name or "Platform"',
        '<strong>Time</strong> - when the notification was created',
        '<strong>Message</strong> - full detail',
      ])}
      ${p('Notification types and their meaning:')}
      ${table(
        ['Type', 'Colour', 'Meaning'],
        [
          ['Success', 'Green',  'An operation completed successfully'],
          ['Info',    'Blue',   'Neutral information, no action required'],
          ['Warning', 'Amber',  'A potential issue - action may be needed'],
          ['Error',   'Red',    'An operation failed - action is required'],
        ]
      )}
      ${p('Each notification type can be individually enabled or suppressed in <strong>Settings → Notifications</strong>.')}

      ${h3('Activity Tab')}
      ${p('The Activity tab shows the platform\'s structured <strong>Activity Log</strong> - a continuous record of technical events from the platform and every plugin. Up to <strong>500</strong> entries are kept, newest-first.')}
      ${p('Each log entry shows: timestamp, level, source plugin ID, and message.')}
      ${p('Log levels:')}
      ${table(
        ['Level', 'Colour', 'When recorded'],
        [
          ['INFO',  'Blue',  'Routine operations, navigation events, state changes'],
          ['WARN',  'Amber', 'Recoverable issues or unexpected conditions'],
          ['ERROR', 'Red',   'Operation failures that need attention'],
          ['DEBUG', 'Grey',  'Verbose technical detail (only when Log Level is set to Verbose or Debug in Settings)'],
        ]
      )}
      ${p('Use the <strong>Level</strong> and <strong>Plugin</strong> filter dropdowns to narrow entries. Click <strong>Clear Log</strong> to wipe the current session log.')}

      ${infoBox('utility.toolbox', 'Diagnostics moved', 'Platform diagnostics, health checks, and Backup &amp; Restore are now grouped together in <strong>Maintenance Center</strong> - accessible from the toolbox icon in the sidebar Utility section.')}
    `,

    'maintenance-center': () => `
      ${h2('Maintenance Center')}
      ${p('The Maintenance Center is the unified administration hub for the ReplyCators platform. It is accessible from the toolbox icon in the sidebar Utility section. It contains two tabs: <strong>Diagnostics</strong> and <strong>Backup &amp; Restore</strong>.')}

      ${h3('Diagnostics Tab (default)')}
      ${p('The Diagnostics tab provides a live health snapshot of the ReplyCators platform. It has three sub-tabs:')}

      ${h3('Overview sub-tab')}
      ${p('The Overview sub-tab shows a concise platform summary only:')}
      ${ul([
        '<strong>Health status bar</strong> - overall pass / warn / fail state with check counts and last-run timestamp',
        '<strong>High-priority items</strong> - any fail or warn results from the last check run, each with a link directly to the relevant detail tab',
        '<strong>Platform snapshot</strong> - extension version, browser, plugin counts, and activity log summary',
        '<strong>Technical details</strong> - raw diagnostic JSON available via an expandable control (collapsed by default)',
      ])}
      ${p('Selecting a high-priority warning opens the tab that owns the detail: <strong>System Checks</strong> for permissions and runtime issues, or <strong>Cache &amp; Storage</strong> for storage quota warnings.')}

      ${h3('System Checks sub-tab')}
      ${p('Click <strong>Run Checks</strong> to run all dependency checks. Checks run in parallel and return Pass / Warn / Fail / Skip / Info. Check categories:')}
      ${table(
        ['Check', 'What it verifies'],
        [
          ['Salesforce host permission',    'Confirms the extension has access to Salesforce domains'],
          ['Cloudability host permission',  'Confirms access to Cloudability/Apptio domains'],
          ['IBM Docs host permission',      'Confirms access to IBM documentation domains'],
          ['Bookmarks API permission',      'Confirms the bookmarks permission is granted'],
          ['Bob Helper server',             'Probes http://127.0.0.1:47123/health - required for Salesforce Execute'],
          ['Bob Helper Port Sync',          'Confirms the extension and server agree on the helper port'],
          ['Bob CLI (IBM Bob)',             'Confirms IBM Bob is on PATH and reports its version'],
          ['Node.js Runtime',              'Confirms Node.js ≥ 18 is running the helper server'],
          ['Bob Working Directory',         'Confirms a path is configured in Settings → Salesforce Case Extractor'],
          ['IBM Docs API',                 'Checks whether the Documentation Finder source index is loaded'],
          ['Salesforce Browser Context',   'Detects whether a Salesforce case tab is currently open'],
          ['Cloudability Browser Context', 'Detects whether a Cloudability tab is currently open'],
        ]
      )}
      ${p('Each check card shows a <strong>Remediation</strong> suggestion and a <strong>Retry</strong> button for checks that can be re-run. Checks never run automatically after the first startup; use the <strong>Run Checks</strong> button to run them on demand.')}

      ${h3('Cache &amp; Storage sub-tab')}
      ${p('The Cache &amp; Storage sub-tab shows storage quota and all plugin-managed caches:')}
      ${ul([
        '<strong>Storage Quota</strong> - current usage against the 5 MB quota (warns at 80%, fails at 95%)',
        'Cache status: Fresh, Aging (&gt;75% of TTL used), Expired, Missing, Invalid',
        'Data age, TTL, estimated size, last updated timestamp, and storage area',
        '<strong>Refresh</strong> button - triggers a live re-fetch via the owning plugin',
        '<strong>Clear</strong> button - removes only that plugin\'s cache (settings and user data are unaffected)',
        'Orphaned key detection - flags <code>rc:plugin:</code> keys that exist in storage but have no registered owner',
      ])}

      ${h3('Backup &amp; Restore Tab')}
      ${p('The Backup &amp; Restore tab exports supported ReplyCators settings and plugin data to a versioned JSON file, then restores validated backups into browser storage.')}
      ${p('See the <strong>Backup and Restore</strong> documentation topic for full export, import, and conflict resolution details.')}
    `,

    'plugin-manager': () => `
      ${h2('Plugin Manager')}
      ${p('The Plugin Manager lists all installed plugins and lets you enable, disable, filter, sort, and reorder them.')}

      ${h3('Enabling and Disabling Plugins')}
      ${p('Click the toggle switch on any plugin row to enable or disable it. When a plugin is disabled:')}
      ${ul([
        'Its sidebar navigation button is hidden',
        'Its Dashboard widget card is hidden',
        'Its Quick Actions shortcut is hidden',
        'Its data is preserved - re-enabling restores everything',
        'If you navigate to a disabled plugin view, you are redirected to Plugin Manager with a warning',
      ])}

      ${h3('Plugin Order')}
      ${p('The order in Plugin Manager controls the order of both Dashboard widget cards and sidebar navigation buttons simultaneously. Use the <strong>Move Up ▲</strong> and <strong>Move Down ▼</strong> buttons on any plugin row. The order persists across sessions.')}

      ${h3('Filtering and Sorting')}
      ${ul([
        'Type in the search box to filter by name, description, or tags',
        'Use the <strong>Status</strong> dropdown to show only active or inactive plugins',
        'Use the <strong>Category</strong> dropdown to filter by plugin category',
        'Click column headers (<strong>Plugin</strong>, <strong>Version</strong>, <strong>Enabled</strong>) to sort ascending or descending',
      ])}

      ${h3('Plugin Details')}
      ${p('Each plugin row shows: status indicator, name, version, description (first 80 characters), tags, enable toggle, Open button, and Move Up/Down controls. Click the <strong>▾ expand button</strong> on any truncated description to see the full text.')}
    `,

    'marketplace': () => `
      ${h2('Plugin Marketplace')}

      ${infoBox('navigation.marketplace', 'Preview Catalog - Not Installable', 'The Marketplace shows planned future plugins only. None of these can be installed from within ReplyCators. This view is a preview of what is coming to the platform.')}

      ${p('Planned plugins shown in the Marketplace:')}
      ${table(
        ['Plugin', 'Category', 'Description'],
        [
          ['ServiceNow',    'ITSM',               'Extract and manage incidents and requests'],
          ['Jira',          'Project Management', 'View and interact with Jira issues directly'],
          ['Confluence',    'Productivity',       'Search and embed Confluence pages'],
          ['Microsoft 365', 'Productivity',       'Teams, Outlook, and SharePoint integration'],
          ['Azure DevOps',  'Developer Tools',    'Work items, pipelines, and repos'],
          ['Power BI',      'Analytics',          'Embed and interact with Power BI reports'],
          ['Zendesk',       'ITSM',               'Manage support tickets from the browser'],
          ['AI Assistant',  'AI',                 'WatsonX, OpenAI, or Azure AI integration'],
          ['SAP',           'Enterprise',         'SAP transaction helper and data extractor'],
          ['Workday',       'Enterprise',         'HR and financial data at your fingertips'],
        ]
      )}
    `,

    'settings': () => `
      ${h2('Settings')}
      ${p('Settings lets you customise the appearance, accessibility, notifications, and behaviour of ReplyCators. All settings are saved automatically. There is no Save button - every change persists the moment you make it.')}

      ${h3('Appearance')}
      ${table(
        ['Setting', 'Options', 'Default', 'Description'],
        [
          ['Theme',      '12 built-in themes',                                                                 'IBM Blue',    'Colour scheme applied to the entire extension. Changes take effect immediately.'],
          ['Font',       'System Default, Inter, Roboto, Open Sans, IBM Plex Sans, Source Sans Pro',           'System',      'Global font family. A live indicator shows whether the selected font is installed. Falls back to Segoe UI when not installed.'],
          ['UI Density', 'Compact / Comfortable / Spacious',                                                   'Comfortable', 'Controls padding in the sidebar, cards, forms, and tables.'],
        ]
      )}
      ${p('<strong>Available themes:</strong> IBM Blue (default), Dark, Midnight Blue, Nord, Dracula, Solarized Dark, Solarized Light, Graphite, High Contrast Dark, High Contrast Light, Light, ReplyCators Signature.')}
      ${p('The <strong>theme toggle button</strong> in the sidebar footer cycles between your last-used dark theme and your last-used light theme.')}

      ${h3('Accessibility')}
      ${table(
        ['Setting', 'Default', 'Description'],
        [
          ['Larger Font Size',       'Off', 'Increases the base text size by ~20%'],
          ['Reduce Animations',      'Off', 'Disables all CSS transitions and fade effects'],
          ['High Contrast Mode',     'Off', 'Increases contrast ratios for text and interactive elements'],
          ['Enhanced Focus Indicators', 'Off', 'Adds prominent focus rings for keyboard navigation'],
        ]
      )}

      ${h3('Notifications')}
      ${table(
        ['Setting', 'Default', 'Description'],
        [
          ['Enable Notifications',   'On',           'Master switch - disables all toasts and new notification history when off'],
          ['Success Notifications',  'On',           'Show or suppress green success toasts'],
          ['Warning Notifications',  'On',           'Show or suppress amber warning toasts'],
          ['Error Notifications',    'On',           'Show or suppress red error toasts'],
          ['Info Notifications',     'On',           'Show or suppress blue informational toasts'],
          ['Notification Duration',  '4 seconds',    'How long a toast stays visible (2 s / 4 s / 6 s / 10 s / 30 s)'],
          ['Notification Position',  'Bottom Right', 'Where toasts appear (Bottom Right, Bottom Left, Top Right, Top Left)'],
        ]
      )}

      ${h3('Dashboard Preferences')}
      ${table(
        ['Setting', 'Default', 'Description'],
        [
          ['Show Plugin Cards',          'On',  'Toggles the plugin widget card grid on the Dashboard'],
          ['Compact Dashboard',          'Off', 'Reduces padding and spacing in the Dashboard view'],
          ['Remember Last Opened View',  'On',  'Reopens to the last active view instead of always starting on Dashboard'],
        ]
      )}

      ${h3('Logging')}
      ${p('<strong>Log Level</strong> controls which entries are recorded in the Activity log (Notifications Center → Activity tab):')}
      ${ul([
        '<strong>Normal</strong> (default) - records info, warning, and error entries',
        '<strong>Verbose</strong> - also records debug entries',
        '<strong>Debug</strong> - maximum detail (may produce very high log volume)',
      ])}

      ${h3('Extension Behavior')}
      ${p('<strong>Default Launch Mode</strong> - controls whether the toolbar icon opens ReplyCators as a popup overlay or in the persistent Side Panel.')}

      ${h3('Plugin-Specific Settings')}
      ${p('Plugin settings appear at the bottom of the Settings page:')}
      ${ul([
        '<strong>Apptio Documentation Finder</strong> - Save search history, Save opened history, Refresh sources from IBM Docs, and Clear saved search/opened/favorite items.',
        '<strong>Salesforce Case Extractor</strong> - Output format (Plain Text / Markdown / JSON), Auto-fill case number toggle, Bob Working Directory (type path then click <strong>Save</strong> to validate and apply), Diagnostic Mode toggle. Execute is disabled until a valid saved path is set. Enable Diagnostic Mode only when troubleshooting Execute failures. <em>Note: the prompt file is written directly to <code>[WorkingDir]\\</code> when a working directory is configured - do not use a directory that should not contain case content.</em>',
        '<strong>Workspace Starter</strong> - Tab Groups default toggle for new and captured profiles.',
        '<strong>Snake</strong> - Game Speed: Slow / Classic / Fast.',
      ])}
    `,

    'send-feedback': () => `
      ${h2('Send Feedback')}
      ${p('The Send Feedback page lets you prepare a plain-text email draft to the ReplyCators development team. ReplyCators does not send the email directly - it opens your default email client with a pre-filled draft that you review and send yourself.')}

      ${infoBox('utility.sendFeedback', 'Email Prepared, Not Sent', 'Clicking <strong>Open Email Client</strong> hands a <code>mailto:</code> draft to your operating system. Your default email application opens with the message pre-filled. ReplyCators cannot confirm whether the message was sent.')}

      ${h3('Recipients')}
      ${p('The recipients are fixed in the platform configuration and cannot be changed:')}
      ${ul([
        '<code>Jakub.Nytko@ibm.com</code>',
        '<code>Marcin.Jorasz@ibm.com</code>',
      ])}

      ${h3('Feedback Workflow')}
      ${ul([
        'Select a <strong>Category</strong> (Bug or problem, Feature request, Plugin feedback, Documentation feedback, General, Other).',
        'Enter a <strong>Subject</strong> (up to 160 characters).',
        'Enter your <strong>Message</strong> (up to 5,000 characters).',
        'Optionally enable <strong>Include Diagnostics</strong> to append a platform diagnostics snapshot to the email body.',
        'Click <strong>Open Email Client</strong> - your default email application opens with the draft.',
        'Review the draft, attach any files manually, and send.',
      ])}

      ${h3('Fallback (when email client cannot open)')}
      ${ul([
        '<strong>Copy Email Addresses</strong> - copies both recipients to the clipboard',
        '<strong>Copy Subject</strong> - copies the subject line',
        '<strong>Copy Feedback</strong> - copies the full message body',
        '<strong>Download Diagnostics</strong> - saves a diagnostics JSON file you can attach manually',
      ])}

      ${p('Attachment handling is always manual. ReplyCators never automatically attaches, uploads, or transmits files.')}
    `,

    'backup-restore': () => `
      ${h2('Backup and Restore')}
      ${p('Backup and Restore exports supported ReplyCators settings and plugin data to a versioned JSON file, then restores validated backups into browser storage. Every imported file is treated as untrusted and fully validated before any write is made.')}

      ${h3('Export Backup')}
      ${ul([
        'Choose <strong>Full export</strong> to include every supported plugin section.',
        'Choose <strong>Selected plugins</strong> to include only checked plugin sections. Platform settings are always included when at least one plugin is selected.',
        'Enable <strong>Include optional data</strong> to include history-style data such as Documentation Finder recent searches and opened history.',
        'Enable <strong>Sanitize before export</strong> to redact sensitive fields (Bob Working Directory, Workspace Starter URLs, selected query/label fields) before the file is created.',
        'Click <strong>Export</strong> - a <code>.json</code> file is downloaded.',
      ])}

      ${h3('Import Backup')}
      ${ul([
        'Click <strong>Choose Backup File…</strong> and select a ReplyCators backup JSON file.',
        'The file is validated: format, version, schema sections, and allowed storage keys are all checked before a preview is shown.',
        'Review the <strong>preview table</strong> - it shows which sections will be restored, how many keys each section contains, and the restore strategy.',
        'Choose a <strong>Conflict strategy</strong>: <strong>Replace</strong> (overwrites matching keys) or <strong>Keep existing on conflict</strong> (skips keys that already have values).',
        'Click <strong>Apply Import</strong> to write the validated data. If the write fails, the plugin attempts to roll back storage to the pre-import snapshot.',
      ])}

      ${h3('What Is Included by Default')}
      ${table(
        ['Area', 'Default export behaviour'],
        [
          ['Platform settings',                                                      'Exported'],
          ['Plugin states and plugin order',                                         'Exported'],
          ['Salesforce prompt library and settings',                                 'Exported'],
          ['Workspace Starter profiles',                                             'Exported'],
          ['Apptio Documentation Finder favorites, settings, sources, quick links', 'Exported'],
          ['Snake high score, Bookmark Finder preferences, Apptio Planning last calculation', 'Exported'],
        ]
      )}

      ${h3('Important Exclusions')}
      ${ul([
        'BobShell 2.0 API key - never exported; security credential that must be re-entered after restore on any machine',
        'Salesforce last extracted case - never exported',
        'Cloudability OrgID cache - never exported',
        'Bookmark scan cache - never exported',
        'Activity log and notification history - never exported',
        'Salesforce download history - never exported',
      ])}

      ${h3('Reload Behaviour')}
      ${p('Some restored platform settings (theme, density, accessibility) require an extension reload to fully apply. When that happens, Backup &amp; Restore shows a <strong>Reload Now</strong> prompt after a successful import.')}

      ${infoBox('states.warning', 'Safety Limits', 'Imports larger than 10 MB are rejected. Files created by a newer backup format version are rejected. Unknown sections are skipped with a warning instead of being restored blindly.')}
    `,

    // ─── PLUGINS ──────────────────────────────────────────────────────────────

    'salesforce': () => `
      ${h2('Salesforce Case Extractor')}
      ${p('Extracts structured case data from open Salesforce pages and produces a ready-to-paste summary. Includes a full AI prompt system for copying assembled prompts or sending them to IBM Bob through a local helper server.')}

      ${infoBox('states.warning', 'Active Tab Required', 'Extraction only runs when a Salesforce Case page is the <strong>active tab</strong>. A Salesforce tab open in the background is not detected. Switch to your Salesforce case tab first.')}

      ${h3('Plugin Tabs')}
      ${table(
        ['Tab', 'Description'],
        [
          ['Extract Case',      'Main extraction workflow - source, toggles, extract, preview, and AI prompt execution'],
          ['Prompt Management', 'Add, edit, duplicate, reorder, and delete custom prompts'],
          ['Download History',  'View and copy the path of the most recently downloaded case file'],
        ]
      )}

      ${h3('What Gets Extracted')}
      ${ul([
        'Case number, Subject, Account name, Contact name',
        'Severity Level (when available on the case record)',
        'Primary Product (when available on the case record)',
        'Next Action Datetime (when available on the case record)',
        'Description (deduplicated - duplicate lines from Salesforce DOM noise are removed)',
        'Agent description (internal notes)',
        'All public feed posts (labelled [Customer Post]) - always included',
        '<strong>Internal posts</strong> (agent-only, not visible to customer) - opt-in via "Internal posts" toggle',
        '<strong>JIRA/ETL posts</strong> (Support ETL automation posts) - opt-in via "JIRA/ETL posts" toggle',
        '<strong>Diagnostic data events</strong> ("Diagnostic Data Uploaded" system events) - opt-in via "Diagnostic data" toggle',
        'Feed posts output in chronological order - order is determined by the <strong>Sort Posts</strong> setting (Ascending = oldest first, Descending = newest first)',
      ])}

      ${h3('Extraction Scope Toggles')}
      ${p('A second toolbar row below the main toolbar contains three opt-in checkboxes. All default to <strong>off</strong> - internal content is never included unless explicitly requested:')}
      ${table(
        ['Toggle', 'Includes'],
        [
          ['Internal posts',  'Non-public posts by agents and support staff (not visible to the customer)'],
          ['JIRA/ETL posts',  'Posts created by the Support ETL automation (detected by author name "Support ETL")'],
          ['Diagnostic data', '"Diagnostic Data Uploaded" system events from the feed'],
        ]
      )}
      ${infoBox('states.warning', 'Internal Content Warning', 'When any scope toggle is checked and extraction runs, a warning is shown: "Internal posts included - review before sharing externally." Always verify the output before sending to a customer or external party.')}

      ${h3('Extraction Workflow')}
      ${ul([
        'Switch to a Salesforce case tab - the detection banner updates automatically.',
        'The <strong>Extract</strong> button enables once a valid case page is detected.',
        '(Optional) Enable scope toggles if internal or diagnostic content is needed.',
        'Click <strong>Extract</strong> - the case summary appears in the Extracted Content panel.',
        'Use <strong>Copy</strong> to copy the summary to the clipboard.',
        'Use <strong>Copy with Prompt</strong> to copy the assembled prompt. When files are attached, outputs quoted comma-separated file paths instead of case data. Enabled when files are attached or case data is present.',
        'Use <strong>Download</strong> to save as a <code>.txt</code> file.',
        'Use <strong>Clear</strong> to reset the current result.',
      ])}

      ${h3('Privacy Mode')}
      ${p('The <strong>Privacy mode</strong> checkbox in the Extract toolbar is enabled by default. When on, it redacts: the Contact field to <code>[REDACTED_CONTACT]</code>, email addresses to <code>[REDACTED_EMAIL]</code>, and inline contact name occurrences throughout the extracted content, clipboard copy, and downloaded file. Toggle it off to restore original text without re-extracting. The preference is saved automatically.')}

      ${h3('Source Options')}
      ${table(
        ['Mode', 'Behaviour'],
        [
          ['Active Salesforce Tab',  'Extracts from the currently focused Salesforce case tab (default)'],
          ['Search by Case Number',  'Enter a case number - all open Salesforce tabs are scanned to find the matching case'],
        ]
      )}

      ${h3('Output Formats and Post Sort Order')}
      ${p('Choose the output format in <strong>Settings → Salesforce Case Extractor → Output Format</strong>: Plain Text (default), Markdown, or JSON.')}
      ${p('Choose the post display order in <strong>Settings → Salesforce Case Extractor → Sort Posts</strong>: <strong>Ascending</strong> (oldest first, default) or <strong>Descending</strong> (newest first). The selected order applies on the next extraction and is reflected in the CASE HISTORY section header. The preference persists across sessions.')}

      ${h3('AI Prompt System')}
      ${p('The right column of the Extract tab shows the Prompt Selection panel. Select a prompt to reveal the Execution Panel:')}
      ${ul([
        'Add up to <strong>6 file attachments</strong> (any format) as context for the prompt.',
        'Enter <strong>Additional Requests</strong> for further instructions.',
        'Click <strong>Execute</strong> to send the extracted case and prompt to IBM Bob.',
        'Click <strong>Copy with Prompt</strong> to copy the assembled prompt to the clipboard. When files are attached, the output contains quoted comma-separated file paths (e.g. <code>"C:\\Folder\\File1.zip", "C:\\Folder\\File2.log"</code>). When no files are attached, the extracted case text is included instead.',
      ])}
      ${p('Two default prompts are always available: <strong>Understand Case</strong> (breaks down the case using IBM Apptio product context) and <strong>Research Case</strong> (correlates Jira and Confluence data for the case).')}

      ${infoBox('states.warning', 'Bob Helper Required for Execute', 'Execute requires the Bob Helper server (<code>tools\\bob-helper-server.js</code>) to be running locally on port 47123. Use the management script to start it: <code>powershell -ExecutionPolicy Bypass -File tools\\bob-helper.ps1 start</code>. Run <code>bob-helper.ps1 check</code> to validate all prerequisites before first use. The Execute button shows a warning when the server is unreachable and stays disabled until a Bob Working Directory is saved and validated in Settings. Bob is invoked with <code>--trust -y --include-directories="[WorkingDir]"</code> to allow it to access the project context automatically.')}

      ${h3('Diagnostic Mode')}
      ${p('Enable <strong>Diagnostic Mode</strong> in <strong>Settings → Salesforce Case Extractor → Diagnostic Mode</strong> when troubleshooting Execute failures. When on, the Bob terminal window stays open after execution and shows:')}
      ${ul([
        'Resolved Bob command path, prompt file path, and working directory',
        'Bob exit code (0 = success)',
        'Start and completion timestamps',
      ])}
      ${p('Disable Diagnostic Mode after troubleshooting - it is intended for temporary use only. In normal mode the terminal still displays the exit code before closing.')}

      ${h3('Prompt Management')}
      ${p('Use the <strong>Prompt Management</strong> tab to create, edit, duplicate, reorder, and delete custom prompts. Default prompts cannot be deleted but can be edited.')}
    `,

    'cloudability-orgid': () => `
      ${h2('Cloudability OrgID')}
      ${p('Resolves the Cloudability Organisation ID from the active Cloudability browser tab. The last successful value is cached locally for later reuse.')}

      ${infoBox('states.warning', 'Active Tab Required', 'OrgID retrieval only runs when Cloudability is the <strong>active tab</strong> you are currently viewing. A Cloudability tab open in the background is not detected. Switch to your Cloudability tab, then click <strong>Refresh OrgID</strong>.')}

      ${h3('How It Works')}
      ${ul([
        '<strong>Interceptor</strong> - a script injected at page start patches XHR and fetch to catch the Cloudability settings API call that contains the OrgID.',
        '<strong>Detector</strong> - a second script in the isolated world catches the intercepted data and forwards it to the extension.',
      ])}
      ${p('This happens automatically when Cloudability makes its settings API request. The OrgID and organisation name are cached locally for up to 24 hours.')}

      ${h3('Using Cloudability OrgID')}
      ${ul([
        'Switch to a Cloudability tab as your active tab.',
        'Open ReplyCators - the OrgID appears automatically if it was already retrieved or cached.',
        'Click <strong>Copy</strong> to copy the OrgID to the clipboard.',
        'Click <strong>Refresh OrgID</strong> if the value is missing or stale.',
        'Click <strong>Include in Diagnostics</strong> to add the OrgID to the Diagnostics snapshot.',
      ])}

      ${h3('Displayed Information')}
      ${table(
        ['Field', 'Description'],
        [
          ['Organisation Name', 'Display name of the Cloudability organisation'],
          ['OrgID',             'Numeric organisation identifier used in API calls and support cases'],
          ['Source',            'Live (retrieved from API) or Cached (from local storage)'],
          ['Last Retrieved',    'Timestamp of the most recent successful retrieval'],
        ]
      )}

      ${h3('Status Indicators')}
      ${table(
        ['Status', 'Meaning'],
        [
          ['Retrieving…',   'A retrieval is in progress'],
          ['Live',          'OrgID retrieved live from the Cloudability settings API'],
          ['Cached',        'OrgID loaded from the local cache'],
          ['No active tab', 'The active browser tab is not a Cloudability page'],
          ['Failed / Timeout', 'Retrieval failed - navigate to Cloudability → Settings and retry'],
        ]
      )}

      ${infoBox('states.info', 'Privacy', 'The OrgID is stored only in your browser\'s local extension storage. It is never transmitted to any external service.')}
    `,

    'env-dashboards': () => `
      ${h2('Environment Dashboards Launcher')}
      ${p('Opens Splunk and Grafana monitoring dashboards for any customer environment with a single click. All dynamic URL parameters are resolved automatically from the active browser tab.')}

      ${h3('Quick Start')}
      ${ul([
        'Open the customer environment in any browser tab (<code>*.apptio.com</code> or <code>*.apps.papt.to</code>).',
        'Open ReplyCators and navigate to <strong>Environment Dashboards Launcher</strong>.',
        'Click <strong>&#8599; Open</strong> on any dashboard card to launch with all parameters pre-filled.',
        'Click <strong>&#8599; Open Blank</strong> to open the same dashboard at its default state with no parameters.',
      ])}

      ${h3('Supported Dashboards')}
      ${table(
        ['Dashboard', 'Provider', 'Auto-resolved parameters'],
        [
          ['String Usage',                       'Splunk',  '<code>form.selectedPrefix</code> = env'],
          ['Background Calculation Profiler',    'Splunk',  '<code>form.selectedContainerPrefix</code> = env'],
          ['AKP BIIT Deployments',               'Grafana', '<code>var-namespace</code>, <code>var-deployment</code>, <code>var-match_namespace</code>'],
          ['AKP BIIT Persistent Volumes (PVC)',  'Grafana', '<code>var-namespace</code>, <code>var-cluster</code>, <code>var-aws_datasource</code>, <code>var-region</code>, <code>var-cluster_datasource</code>'],
        ]
      )}

      ${h3('Supported Environment URLs')}
      ${table(
        ['URL pattern', 'Example'],
        [
          ['<code>*.apptio.com</code>',    '<code>csbox-emea-r12.apptio.com</code>'],
          ['<code>*.apps.papt.to</code>',  '<code>csbox-us-east-r12.apps.papt.to/biit/data/</code>'],
        ]
      )}
      ${p('The environment name is the leading DNS label of the subdomain - for example, <code>csbox-emea-r12</code> from <code>csbox-emea-r12.apptio.com</code>.')}

      ${h3('Region Map')}
      ${p('Grafana dashboards require cluster-specific datasource identifiers. The plugin derives these from the region token embedded in the environment name:')}
      ${table(
        ['Token in env name', 'AKP Cluster', 'CloudWatch Region'],
        [
          ['<code>us-east</code>', '<code>uw2p-akp-b7</code>', '<code>us-west-2</code>'],
          ['<code>us-west</code>', '<code>uw2p-akp-b1</code>', '<code>us-west-2</code>'],
          ['<code>emea</code>',   '<code>ew1p-akp-b1</code>', '<code>eu-west-1</code>'],
          ['<code>apac</code>',   '<code>aps1-akp-b1</code>', '<code>ap-southeast-1</code>'],
        ]
      )}

      ${infoBox('states.warning', 'PVC Dashboard - Manual Step Required',
        'The Persistent Volumes dashboard opens with cluster, region and namespace pre-filled. ' +
        'The specific <strong>persistentvolumeclaim</strong> cannot be derived from the environment name - ' +
        'select it from the dropdown in Grafana after opening to see data.')}

      ${h3('Launch Modes')}
      ${table(
        ['Button', 'Behaviour'],
        [
          ['<strong>&#8599; Open</strong>',       'Reads env from active browser tab, injects all dynamic parameters (prefix, namespace, cluster, datasource, region) into the dashboard URL.'],
          ['<strong>&#8599; Open Blank</strong>',  'Opens the dashboard base URL with no injected parameters. Dashboard loads in its default state - useful for exploratory browsing or when no customer tab is active.'],
        ]
      )}
      ${p('Access full documentation via the <strong>Docs</strong> button in the plugin view header, or through the Documentation section in the sidebar.')}
    `,

    'workspace-starter': () => `
      ${h2('Workspace Starter')}
      ${p('Launch your daily workspace with a single click. Create profiles containing multiple URLs and open all tabs at once in either tab-group or plain-tabs mode.')}

      ${h3('Creating a Profile')}
      ${ul([
        'Click <strong>+ New Profile</strong> in the toolbar.',
        'Enter a profile name.',
        'Add one or more URLs.',
        'Optionally set a <strong>Category</strong> to group profiles.',
        'Click <strong>Save</strong>.',
      ])}

      ${h3('Launching a Profile')}
      ${p('Click the <strong>▶ Launch</strong> button on any profile card. All URLs open as new tabs in either tab-group or plain-tabs mode, depending on that profile\'s stored launch mode setting.')}

      ${h3('Favorites')}
      ${p('Click the star icon on a profile card to mark it as a favourite. Favourited profiles appear above non-favourites and show as quick-launch shortcuts in the Dashboard widget.')}

      ${h3('Capturing Your Current Window')}
      ${p('Click <strong>Capture Window</strong> to create a new profile from all valid http/https tabs in the current browser window. The captured profile uses the current Workspace Starter default for its launch mode.')}

      ${h3('Relaunching the Last Profile')}
      ${p('After any launch, a <strong>Last launched</strong> bar appears at the top of the list with a <strong>▶ Relaunch</strong> button for one-click re-launch.')}

      ${h3('Search, Filter, Import/Export')}
      ${ul([
        'Use the <strong>Search</strong> box to filter profiles by name and URL.',
        'Use the <strong>Category</strong> dropdown to filter profiles by category.',
        '<strong>Export All</strong> downloads all profiles as a JSON file.',
        '<strong>Import</strong> loads profiles from a previously exported JSON file (duplicate IDs are re-keyed automatically).',
        'Each profile card also has an individual <strong>Export</strong> action.',
      ])}

      ${infoBox('states.info', 'Tab Groups', 'Tab grouping requires browser support for <code>chrome.tabGroups</code> (Edge 89+). Use each profile\'s <strong>Launch mode</strong> field to choose between Tab Group and Plain Tabs. The Workspace Starter setting in Settings only changes the default mode used when creating or capturing new profiles.')}
    `,

    'tab-search': () => `
      ${h2('Tab Search')}
      ${p('Search, filter, navigate, and manage all open browser tabs across all windows - instantly.')}

      ${h3('Search')}
      ${p('Type in the search box to filter tabs by title, URL, or hostname. All terms must match. Results update as you type.')}

      ${h3('Sort Modes')}
      ${table(
        ['Mode', 'Description'],
        [
          ['Browser Order',    'Tabs in their current browser order (default)'],
          ['By Title',         'Alphabetical by tab title'],
          ['By Domain',        'Alphabetical by hostname'],
          ['Recently Active',  'Most recently used tabs first'],
        ]
      )}

      ${h3('Group by Domain')}
      ${p('Use the <strong>Group by Domain</strong> toggle to switch between a flat list and hostname-grouped sections. Each domain group shows a tab count.')}

      ${h3('Statistics Bar')}
      ${p('The bar at the top shows: Total Tabs, Active Tabs, Duplicate Tabs (same URL in multiple tabs), Unique Domains.')}

      ${h3('Per-Tab Actions')}
      ${ul([
        '<strong>Switch to</strong> - activates the tab and focuses its window',
        '<strong>Copy URL</strong> - copies the tab URL to the clipboard',
        '<strong>Copy Title</strong> - copies the tab title',
        '<strong>Open in New Window</strong> - opens the URL in a new window',
        '<strong>Close Tab</strong> - closes the tab immediately',
      ])}
      ${p('The currently active tab is highlighted with an accent left-border.')}
    `,

    'apptio-docs-finder': () => `
      ${h2('Apptio Documentation Finder')}
      ${p('Build and open IBM Documentation searches for Apptio, Platform, Cloudability, and Targetprocess directly from ReplyCators. All search results open in a browser tab - an internet connection is required.')}

      ${infoBox('states.info', 'First Run Setup', 'On the first launch, the plugin runs a setup flow that fetches the documentation source index from the IBM Documentation API. You can refresh the index at any time from the Index tab or Sources overlay.')}

      ${h3('Tabs')}
      ${table(
        ['Tab', 'Description'],
        [
          ['Search',    'Search IBM Documentation - enter query, select domain and category, click Search IBM Docs'],
          ['Favorites', 'Saved searches and links - up to 50 entries; badge shows count'],
          ['Recent',    'Last 20 search queries - click to re-run or save as favourite'],
          ['Opened',    'Last 30 IBM Docs pages you opened from this plugin'],
          ['Index',     'Live stats: sources, quick links, last refresh time, domain breakdown'],
        ]
      )}

      ${h3('Search Domains')}
      ${table(
        ['Domain', 'Covers'],
        [
          ['Apptio',        'TBM Studio, Costing, Planning, Billing, Benchmarking'],
          ['Platform',      'Datalink, Datalink Classic, Administration, Reports, User Management'],
          ['Cloudability',  'Enterprise, Financial Planning, Savings Automation, Rightsizing, Business Mapping'],
          ['Targetprocess', 'ATP, Portfolio, Hierarchy, Boards, Metrics'],
        ]
      )}

      ${h3('URL Preview Panel')}
      ${p('Below the search buttons on the Search tab, a collapsed <strong>URL Preview</strong> panel shows the exact IBM Docs URL that will be opened - including the resolved domain, category label, scope path, and resolution method. A warning appears when no scope is active (meaning the search covers all IBM products).')}

      ${h3('Keyboard Shortcuts')}
      ${table(
        ['Shortcut', 'Action'],
        [
          ['Enter (in search field)', 'Execute search'],
          ['S (not in a text field)', 'Open Sources overlay'],
          ['Escape',                  'Close Sources overlay or return to Search tab'],
        ]
      )}

      ${h3('Sources Manager')}
      ${p('Click <strong>Sources</strong> (or press <strong>S</strong> on the Search tab) to open the Sources overlay. From there you can refresh the index from IBM Docs, reset to built-in defaults, add custom sources, or remove individual sources.')}
    `,

    'apptio-calculator': () => `
      ${h2('Apptio Planning Upgrade Calculator')}
      ${p('Calculates Apptio Planning upgrade dates for support engineers. Given a customer\'s current version and their upgrade day, the calculator produces the exact production and sandbox upgrade dates.')}

      ${infoBox('states.info', 'Internet Required for Live Data', 'The calculator fetches the latest release schedule from IBM Community when the cache is missing or expired. If that fetch fails, the bundled local fallback schedule is used automatically.')}

      ${h3('Tabs')}
      ${table(
        ['Tab', 'Description'],
        [
          ['Next Release',     'Shows the next scheduled Apptio Planning release and production date'],
          ['Calculator',       'Computes upgrade dates for a given version and upgrade day'],
          ['Release Schedule', 'Full table of all upcoming releases and their dates'],
        ]
      )}

      ${h3('Using the Calculator')}
      ${ul([
        'Navigate to <strong>Apptio Calculator</strong> in the sidebar.',
        'Select the customer\'s current or target version.',
        'If you know the customer\'s upgrade day, select it. Use <strong>Unknown</strong> for a full 7-day window.',
        'The calculator displays the production and sandbox upgrade dates.',
        'Click <strong>Copy Summary</strong> to copy the result to the clipboard.',
      ])}

      ${p('The plugin checks a cached schedule first (24-hour TTL). If the cache is missing or expired, it fetches the IBM Community page. If that fails, it falls back to a bundled fallback schedule included with the extension. Future releases appear automatically with no hardcoded version list.')}
    `,

    'bookmark-finder': () => `
      ${h2('Edge Bookmark Finder')}
      ${p('Searches your Microsoft Edge bookmarks across the complete bookmark hierarchy: Bookmark Bar, Other Bookmarks, Mobile Bookmarks, and all nested folders.')}

      ${h3('Search')}
      ${ul([
        'Type in the search box - results update a moment after you stop typing.',
        'All terms must match. Search is case-insensitive and partial-match.',
        'By default, search checks title, URL, domain, and folder path.',
        'Use the checkboxes to include or exclude URL text and folder-name matches.',
        'Results are capped at <strong>200 items</strong>.',
      ])}

      ${h3('Result Rows')}
      ${table(
        ['Action', 'How to trigger'],
        [
          ['Open bookmark',      'Click anywhere on the result row - opens in a new active tab'],
          ['Open duplicate tab', 'Click the open button on the right to open a second tab for the same URL'],
          ['Copy URL',           'Click the Copy button on the right'],
        ]
      )}
      ${p('Duplicate bookmarks (same URL in multiple locations) are marked with a <strong>duplicate</strong> badge.')}

      ${h3('Recently Added')}
      ${p('Below the search results, a <strong>Recently Added</strong> section shows the 10 most recently added bookmarks.')}

      ${h3('Analytics')}
      ${p('Click <strong>Analytics</strong> to expand the analytics panel. It shows total bookmark and folder counts, deepest nesting level, duplicate URL count, top 10 domains, and the last 10 bookmarks added.')}

      ${infoBox('states.info', 'Bookmark Scan', 'On first open, the plugin scans your entire bookmark tree and caches the result. On later opens, results load from the cached scan. Click <strong>Re-scan</strong> to force a fresh scan at any time.')}
    `,

    'snake': () => `
      ${h2('Snake')}
      ${p('A classic retro arcade Snake game inside ReplyCators.')}

      ${h3('Controls')}
      ${table(
        ['Input', 'Action'],
        [
          ['Arrow keys',    'Steer the snake'],
          ['WASD',          'Alternative steering'],
          ['Space',         'Pause / Resume'],
          ['D-pad buttons', 'On-screen controls (visible in Side Panel mode only)'],
        ]
      )}

      ${h3('Game States')}
      ${ul([
        '<strong>Start screen</strong> - press any arrow key or click Start to begin',
        '<strong>Running</strong> - active game',
        '<strong>Paused</strong> - press Space or the Pause button to toggle',
        '<strong>Game over</strong> - press Space or an arrow key to restart',
      ])}

      ${h3('High Score &amp; Speed')}
      ${p('Your high score is saved automatically and persists across sessions. It appears on the game canvas and in the Dashboard widget.')}
      ${p('Change game speed in <strong>Settings → Snake → Game Speed</strong>: Slow, Classic (recommended), or Fast. You can also change speed directly via the speed buttons below the game canvas.')}
      ${p('Navigating away from Snake auto-pauses the game. Returning resumes where you left off.')}
    `,

    // ─── PLUGIN DEVELOPMENT ───────────────────────────────────────────────────

    'example-plugin': () => `
      ${h2('Example Plugin')}
      ${p('The Example Plugin is the canonical flat-runtime reference implementation for the ReplyCators plugin architecture. It is the authoritative baseline for the ReplyCators AI Plugin Kit and the recommended starting point for creating new plugins.')}

      ${h3('What It Demonstrates')}
      ${ul([
        'A working plugin view and Dashboard widget card',
        'A <strong>Say Hello</strong> action that triggers the platform notification and logging APIs',
        'The complete flat-runtime plugin lifecycle: <code>init()</code>, <code>render()</code>, <code>onNavigate()</code>, and <code>onLeave()</code>',
        'Widget button wiring in <code>init()</code> using a stable element ID - the approved pattern for Dashboard widget interactions',
        'Writing to the Activity log on user action',
        'Showing both a toast and a Notifications Center entry from the same operation',
      ])}

      ${h3('Lifecycle Methods')}
      ${table(
        ['Method', 'When called', 'What this plugin does'],
        [
          ['<code>init()</code>',       'Once, at startup after the shell is ready', 'Wires the Dashboard widget button click handler'],
          ['<code>render()</code>',     'Every time the Example Plugin view is opened', 'Builds and injects the plugin UI'],
          ['<code>onNavigate()</code>', 'When navigating to this plugin view', 'Logs the navigation event'],
          ['<code>onLeave()</code>',    'When leaving this plugin view', 'Logs the leave event - placeholder for cleanup'],
        ]
      )}

      ${infoBox('documentation.gettingStarted', 'Developer Starting Point', 'To create a new plugin, follow <strong>Workflow A</strong> in <code>docs/AI-PLUGIN-KIT.md</code>: copy <code>plugins/example-plugin.js</code>, rename the PLUGIN_ID and display name, replace the <code>render()</code> body, and register the plugin in <code>dashboard.js</code> and <code>dashboard.html</code>.')}
    `,

    'plugin-sdk': () => `
      ${h2('Plugin SDK')}
      ${p('The ReplyCators Plugin SDK defines the non-negotiable standards every plugin must follow to integrate safely with the platform.')}

      ${h3('Key References')}
      ${table(
        ['Document', 'What it covers'],
        [
          ['<code>docs/AI-PLUGIN-KIT.md</code>', '<strong>Primary guide</strong> for AI agents and developers - architecture, Example Plugin, create from scratch, extension migration, security, accessibility, validation checklist'],
          ['<code>PLUGIN-SDK.md</code>',          'SDK Standards - required platform standards, optional scaffolding generator reference, Example Plugin baseline'],
          ['<code>plugins/example-plugin.js</code>', 'The authoritative runtime baseline - copy and adapt for every new plugin'],
          ['<code>plugins/shared/icon-helper.js</code>', 'Shared icon renderer and semantic registry - all plugins must use this for icons'],
        ]
      )}

      ${h3('Plugin Registration')}
      ${p('Every plugin is an IIFE that self-registers on <code>window.ReplyCatorsPlugins</code>:')}
      ${ul([
        '<strong>PLUGIN_ID</strong> must use reverse-domain format: <code>com.replycators.plugin-name</code>',
        'The plugin object must expose at minimum: <code>render()</code>',
        'Optional lifecycle hooks: <code>init()</code>, <code>onNavigate()</code>, <code>onLeave()</code>',
        'Platform APIs are accessed through <code>window.ReplyCatorsApp</code> - no direct <code>dashboard.js</code> function calls',
      ])}

      ${h3('Icon Policy')}
      ${p('All icons must use the Streamline Ultimate Colors - Free icon pack through the local asset library and central semantic registry. Emoji, Unicode pictographs, external URLs, and all other icon sources are prohibited.')}
      ${ul([
        'Every icon reference is a semantic ID: e.g. <code>plugins.myPlugin</code>',
        'Semantic IDs are registered in <code>ICON_REGISTRY</code> inside <code>plugins/shared/icon-helper.js</code>',
        'Use <code>window.ReplyCatorsIconHelper.iconImgTag(semanticId, size)</code> to render an icon',
      ])}

      ${h3('Scaffolding Generator (optional)')}
      ${p('An optional interactive generator can create the initial plugin file from the Example Plugin baseline. Run <code>npm run create-plugin</code> from the repository root. The generator is a convenience tool only - the manual workflow described in the AI Plugin Kit is authoritative.')}
    `,

    // ─── SUPPORT ──────────────────────────────────────────────────────────────

    'troubleshooting': () => `
      ${h2('Troubleshooting')}
      ${p('Look up your symptom below. All diagnostics information is available in <strong>Maintenance Center → Diagnostics</strong>.')}

      ${h3('Extension Won\'t Load')}
      ${ul([
        'Reload the extension at <code>edge://extensions/</code> - toggle it off, then back on.',
        'Right-click the extension icon → <strong>Inspect</strong> → Console - check for JavaScript errors.',
        'Verify <code>manifest.json</code> is valid JSON.',
        'Ensure no directory in the extension folder has a name beginning with <code>__</code> (browsers refuse to load such extensions).',
      ])}

      ${h3('Plugin View Is Blank or Shows No Content')}
      ${ul([
        'Check <strong>Plugin Manager</strong> - is the plugin enabled?',
        'Open popup DevTools and check for JavaScript errors specific to the plugin.',
        'Navigate away and back to the plugin view - this triggers a fresh render.',
      ])}

      ${h3('Salesforce Extract Button Stays Disabled')}
      ${ul([
        '<strong>Switch to a Salesforce case tab first.</strong> The Extract button only enables when a Salesforce Case page (<code>/lightning/r/Case/</code>) is the active tab.',
        'The button enables automatically on detection - no manual refresh is needed.',
        'Ensure the Salesforce host permission is granted at <code>edge://extensions/ → Details → Site Access</code>.',
        'Make sure the Salesforce page has fully loaded before opening ReplyCators.',
      ])}

      ${h3('Salesforce Execute Fails or "Failed to reach Bob helper"')}
      ${ul([
        'The Bob Helper server must be running. Start it with <code>powershell -ExecutionPolicy Bypass -File tools\\bob-helper.ps1 start</code> and leave the terminal open. Run <code>bob-helper.ps1 check</code> to validate all prerequisites.',
        'Verify prerequisites manually: <code>node --version</code>, <code>bob --version</code>, <code>curl http://127.0.0.1:47123/health</code>.',
        'Ensure <strong>Bob Working Directory</strong> is configured in <strong>Settings → Salesforce Case Extractor</strong>.',
        'Open <strong>Maintenance Center → Diagnostics</strong> and click <strong>Run Checks</strong>. The Bob Helper Server check and Bob Working Directory check report exact status with remediation guidance.',
        'If you see "Warn: Server running, Bob not on PATH", install IBM Bob CLI and add it to your system PATH.',
        'Enable <strong>Diagnostic Mode</strong> in <strong>Settings → Salesforce Case Extractor</strong> to keep the Bob terminal window open and display resolved paths, exit code, and timing - useful for identifying exactly where the failure occurs.',
      ])}

      ${h3('Cloudability OrgID Not Appearing')}
      ${ul([
        '<strong>Switch to your Cloudability tab first</strong> - the active tab must be <code>*.apptio.com/cloudability*</code> or <code>*.apps.papt.to/cloudability*</code>.',
        'Background Cloudability tabs are not detected.',
        'Click <strong>Refresh OrgID</strong> while the Cloudability tab is active.',
        'If retrieval times out, navigate to Cloudability → Settings manually (this triggers the settings API call the interceptor needs), then click Refresh again.',
        'Ensure the Cloudability host permission is granted at <code>edge://extensions/ → Details → Site Access</code>.',
      ])}

      ${h3('Notifications Not Appearing')}
      ${ul([
        'Go to <strong>Settings → Notifications</strong> and ensure <strong>Enable Notifications</strong> is on.',
        'Check that the specific type (Success / Warning / Error / Info) is also enabled.',
      ])}

      ${h3('Settings Not Persisting')}
      ${ul([
        'Settings save automatically - there is no Save button. If settings reset on reopen, check that Edge has not cleared extension data.',
        'Go to <code>edge://settings/cookies</code> and ensure the extension\'s storage is not being cleared on browser close.',
        'Open <strong>Maintenance Center → Diagnostics</strong> and check storage usage.',
      ])}

      ${h3('Workspace Starter Shows Empty Profile List')}
      ${ul([
        'The list requires a moment to load from storage on first open - wait a second.',
        'If profiles are genuinely missing, re-import from a previous JSON export.',
        'Check the Activity log for Workspace Starter storage errors.',
      ])}

      ${h3('Backup Export Does Nothing')}
      ${ul([
        'Check the Activity log for an export error.',
        'Ensure the browser allows file downloads from extensions (check browser download settings).',
        'Check <strong>Diagnostics</strong> for storage usage - a near-full quota can prevent reads.',
      ])}

      ${h3('Backup Import Shows "Not a ReplyCators backup file"')}
      ${ul([
        'Only import files downloaded from the ReplyCators Backup &amp; Restore view. The file must contain <code>"_format": "replycators-backup"</code> at the root.',
        '"Backup was created by a newer version" - upgrade ReplyCators to the latest version before importing.',
      ])}

      ${h3('Apptio Documentation Finder Shows No Categories')}
      ${ul([
        'Open the <strong>Index</strong> tab and click <strong>↻ Refresh Sources from IBM Docs</strong>.',
        'Ensure you have an internet connection - the IBM Docs API at <code>ibm.com/docs/api/v1/products</code> must be reachable.',
      ])}

      ${h3('Edge Bookmark Finder "Scanning…" Stuck')}
      ${ul([
        'Verify the <code>bookmarks</code> permission is listed in <code>manifest.json</code>.',
        'Reload the extension at <code>edge://extensions/</code>.',
        'Check the Activity log for a permission error entry.',
      ])}

      ${h3('Snake Freezes or Acts Erratically')}
      ${ul([
        'Navigate away from Snake and back - the plugin\'s <code>onLeave</code> / <code>onNavigate</code> hooks stop and restart the game loop cleanly.',
      ])}
    `,

    'release-notes': () => `
      ${h2('Release Notes')}

      ${h3('v1.43.0 - Unified Documentation Navigation')}
      ${badge('Feature', 'green')} ${badge('Platform', 'blue')}
      ${p('Every plugin now exposes a documentation icon entry point via the new <code>rc-doc-icon</code> component - an icon-only button using the Streamline documentation SVG, placed at the far right of every plugin panel header and inside every widget card header. All legacy text Docs buttons and Help & Docs tabs are removed. The Environment Dashboards Launcher Help tab is replaced by the shared <code>rc-doc-icon</code>. The centralized <code>PLUGIN_DOC_MAP</code> in <code>dashboard.js</code> maps every plugin view to its documentation topic. <code>navigateToPluginDoc()</code> is available to all plugin modules via <code>window.ReplyCatorsApp</code>. Documentation content remains centralized with no duplication across plugins.')}

      ${h3('v1.38.1 - Salesforce Case Extractor: Unified Feed, Description Fix, Prompt Unlock')}
      ${badge('Bug Fix', 'red')} ${badge('Salesforce', 'blue')}
      ${p('Three patch fixes: (1) All post types (customer, internal, JIRA/ETL, diagnostic) now appear in a single chronologically sorted CASE HISTORY section - each labeled by type. (2) Rich-text Description fields containing embedded links (e.g. an org URL) now extract correctly; previously only the link text was returned. (3) Built-in prompts (Understand Case, Research Case) can now be deleted - the <code>isDefault</code> lock is removed.')}

      ${h3('v1.38.0 - Salesforce Case Extractor: Extraction Toggles, New Fields &amp; Library Removal')}
      ${badge('Feature', 'green')} ${badge('Salesforce', 'blue')}
      ${p('Three opt-in extraction scope toggles added (Internal posts, JIRA/ETL posts, Diagnostic data - all off by default). Three new extracted case header fields: Severity Level, Primary Product, Next Action Datetime. Copy with Prompt now outputs quoted comma-separated file paths when attachments are present, and is enabled whenever files are attached even without extraction. Prompt Library tab removed.')}

      ${h3('v1.34.0 - Icon System Full Repair and Streamline Migration')}
      ${badge('Infrastructure', 'blue')} ${badge('Fix', 'amber')}
      ${p('Completed full repair of the ReplyCators icon system. All broken-image placeholders eliminated. Repaired 8 empty navigation SVG files (Dashboard, Plugin Manager, Options, Diagnostics, Notifications, Activity, Backup and Restore, Documentation). Corrected 4 wrong registry paths. Replaced the Send Feedback icon with the correct Streamline asset. Removed 37 orphaned Material Symbols files. Added 3 new icons. Total local Streamline SVG count: 100. Rewrote <code>docs/ICON-SYSTEM.md</code> and <code>icon-manifest.json</code> in full. Fixed <code>tools/create-plugin.js</code> to use semantic IDs instead of emoji. All future icons permanently require the semantic ID → registry → local SVG → shared renderer flow.')}

      ${h3('v1.33.5 - Send Feedback Working Form')}
      ${badge('Feature', 'green')} ${badge('Privacy', 'blue')}
      ${p('Replaced the static Send Feedback placeholder with a working feedback form. Prepares an unsent plain-text <code>mailto:</code> draft to <code>Jakub.Nytko@ibm.com</code> and <code>Marcin.Jorasz@ibm.com</code>. Supports category, subject, message, diagnostics preview, diagnostics download, copy fallback, and <strong>Open Email Client</strong>. ReplyCators does not send the email directly. All logic is entirely client-side. Mailto recipient separator changed to semicolon for Outlook compatibility. Diagnostics expanded to include plugin status details, activity counters, and storage quota information.')}

      ${h3('v1.30.0 - AI Plugin Kit, Plugin Generator, and Example Plugin Corrections')}
      ${badge('Feature', 'green')} ${badge('Developer Experience', 'blue')}
      ${p('Introduced the ReplyCators AI Plugin Kit (<code>docs/AI-PLUGIN-KIT.md</code>) - comprehensive guide for AI agents and developers. Added the optional Plugin Generator (<code>npm run create-plugin</code>). Corrected the Example Plugin to include <code>onNavigate()</code> and <code>onLeave()</code> lifecycle methods and Dashboard widget button wiring.')}

      ${h3('v1.29.0 - Dashboard Plugins-First Information Architecture')}
      ${badge('Enhancement', 'amber')} ${badge('Platform', 'blue')}
      ${p('Reorganized the Dashboard to put high-frequency plugin actions first. Quick Actions moved to section 1. Plugin widget cards moved to section 2. Platform Status stats row moved to section 3. Sidebar navigation icons reordered by functional group.')}

      ${h3('v1.28.0 - Diagnostics: Cache &amp; Storage Inspector and Pre-flight v2')}
      ${badge('Feature', 'green')} ${badge('Platform', 'blue')}
      ${p('Added a centralized cache registry and Cache &amp; Storage tab in Diagnostics with TTL status, size estimation, refresh and clear actions, and orphaned key detection. Completed the Pre-flight Health Check system with ten checks, grouped categories, remediation guidance, retry buttons, and an ARIA live region.')}

      ${h3('v1.26.0 - Apptio Documentation Finder')}
      ${badge('Feature', 'green')} ${badge('Productivity', 'blue')}
      ${p('Full integration of the standalone Apptio Documentation Finder as a native plugin. IBM Docs keyword search, domain filter, category scoping, favorites, recent searches, opened history, index status, quick link chips, sources overlay, URL Preview panel, first run setup, and keyboard shortcuts.')}

      ${h3('v1.21.0 - Salesforce Unified Prompt System')}
      ${badge('Feature', 'green')} ${badge('Salesforce', 'blue')}
      ${p('All prompts share a single unified execution panel with 0-6 file attachments and an Additional Requests field. Prompt selection redesigned as a scalable scrollable list. Full prompt management: create, edit, duplicate, reorder, delete.')}

      ${h3('v1.20.0 - Documentation System')}
      ${badge('Feature', 'green')} ${badge('Platform', 'blue')}
      ${p('In-extension Help &amp; Documentation view added to the Platform sidebar with self-contained content and no network requests.')}

      ${h3('v1.19.0 - Tab Search Plugin')}
      ${badge('Feature', 'green')} ${badge('Productivity', 'blue')}
      ${p('Added Tab Search with browser-wide tab search, sorting, grouping by domain, duplicate detection, and per-tab actions.')}

      ${h3('v1.17.0 - Plugin Module Architecture')}
      ${badge('Architecture', 'blue')}
      ${p('All plugin implementations extracted from <code>dashboard.js</code> into independent IIFE modules under <code>plugins/</code>. <code>dashboard.js</code> is now the orchestration layer only.')}

      ${h3('v1.15.0 - Workspace Starter v2.0.0')}
      ${badge('Feature', 'green')}
      ${p('Complete rewrite with categories, favorites, recents, tab grouping, import/export, and a full Dashboard widget.')}

      ${p('<em>For the complete change history, see <code>CHANGELOG.md</code> in the repository.</em>')}
    `,

  };

  // ── Register ─────────────────────────────────────────────────────────────────

  /**
   * setTopic() - Pre-select a topic before the documentation view renders.
   *
   * Called by navigateToPluginDoc() in dashboard.js to open documentation
   * directly at the plugin's topic without requiring a second interaction.
   *
   * @param {string} topicId  A valid topic ID from TOPICS_FLAT.
   */
  function setTopic(topicId) {
    const topic = TOPICS_FLAT.find(t => t.id === topicId);
    if (topic) {
      activeTopic = topicId;
      // Expand the group that owns this topic so it is visible in the nav.
      for (const g of NAV_GROUPS) {
        if (g.topics.some(t => t.id === topicId)) {
          groupExpanded[g.id] = true;
          break;
        }
      }
    }
  }

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.Documentation = { render, setTopic };

  // Pick up any pending topic that was stored before the Documentation module
  // had loaded (e.g. navigateToPluginDoc() was called early in startup).
  if (window._rcDocsPendingTopic) {
    setTopic(window._rcDocsPendingTopic);
    window._rcDocsPendingTopic = null;
  }

})();
