// ─── Workspace Starter Plugin ─────────────────────────────────────────────────
//
// Workspace Starter: launch your entire daily workspace with one click.
// Manage named workspace profiles, each containing a list of URLs.
// Supports tab groups, favorites, recents, categories, import/export.
//
// Storage keys (all chrome.storage.local):
//   WS_STORAGE_KEY   → { profiles: [], lastLaunchedId: null, recents: [] }
//   (appSettings.wsDefaultTabGroups persisted by platform via window.ReplyCatorsApp)
//
// Public API (window.ReplyCatorsPlugins.WorkspaceStarter):
//   init(currentView)  - load data, wire widget buttons
//   render()           - render the full plugin view

(function () {
  'use strict';

  const PLUGIN_ID      = 'com.replycators.workspace-starter';
  const WS_STORAGE_KEY = 'rc:plugin:' + PLUGIN_ID + ':data';

  // ── State ──────────────────────────────────────────────────────────────────
  let wsProfiles       = [];     // [{ id, name, urls, launchMode, category, favorite, createdAt }]
  let wsLastLaunchedId = null;   // profile ID of most recently launched profile
  let wsRecents        = [];     // [profileId, ...] last 5 launched, newest first
  let wsCurrentMode    = 'list'; // 'list' | 'form'
  let wsEditingId      = null;   // profile ID being edited (null = new)
  let wsDataLoaded     = false;  // true once wsLoadData() callback has fired

  function app() { return window.ReplyCatorsApp; }

  // ── ID generation ──────────────────────────────────────────────────────────

  function wsGenId() {
    return 'ws-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  // ── Persistence ────────────────────────────────────────────────────────────

  function wsSaveProfiles() {
    // DIAG-006 fix: added error callback. Without it, a storage-full condition
    // caused silent divergence between in-memory state and persisted storage -
    // the user would see a profile that disappears on the next popup open with no
    // visible error message.
    chrome.storage.local.set({
      [WS_STORAGE_KEY]: {
        profiles:       wsProfiles,
        lastLaunchedId: wsLastLaunchedId,
        recents:        wsRecents,
      },
    }, () => {
      if (chrome.runtime.lastError) {
        const a = app();
        if (a) {
          a.addNotification(
            'Workspace Starter',
            'Could not save workspace data - storage may be full. Open Diagnostics to check quota.',
            'error',
            PLUGIN_ID
          );
          a.addLog('error', PLUGIN_ID, 'wsSaveProfiles failed: ' + chrome.runtime.lastError.message);
        }
      }
    });
  }

  function wsSaveLastLaunched(id) {
    wsLastLaunchedId = id;
    wsSaveProfiles();
  }

  function wsSaveRecents(id) {
    wsRecents = [id, ...wsRecents.filter(r => r !== id)].slice(0, 5);
    wsSaveProfiles();
  }

  // ── Default seed profiles ──────────────────────────────────────────────────

  function wsSeedDefaults() {
    // Only one default profile is seeded on first install.
    // URLs match the canonical Support Morning workspace as defined in requirements.
    wsProfiles = [
      {
        id:         wsGenId(),
        name:       'Support Morning',
        urls:       [
          'https://ibmsf.lightning.force.com/lightning',
          'https://five9-vcc.okta.com/app/five9agentdesktopplus/exk4p33owXasyyCi5696/sso/saml',
          'https://apptio.atlassian.net/jira/your-work',
        ],
        launchMode: 'tab-group',
        category:   'Support',
        favorite:   true,
        createdAt:  Date.now(),
      },
    ];
    wsSaveProfiles();
    app().addLog('info', PLUGIN_ID, 'Workspace Starter: default profiles seeded');
  }

  // ── Profile migration (v1 → v2) ────────────────────────────────────────────

  function wsMigrateProfiles(raw) {
    if (!Array.isArray(raw)) return [];
    return raw.map(p => ({
      id:         p.id        || wsGenId(),
      name:       p.name      || 'Unnamed Profile',
      urls:       Array.isArray(p.urls) ? p.urls.filter(u => typeof u === 'string' && u.trim()) : [],
      launchMode: (p.launchMode === 'tab-group' || p.launchMode === 'tabs')
        ? p.launchMode
        : (p.tabGroup === true ? 'tab-group' : 'tabs'),
      category:   p.category  || '',
      favorite:   !!p.favorite,
      createdAt:  p.createdAt || Date.now(),
    }));
  }

  // ── Data load ──────────────────────────────────────────────────────────────

  function wsLoadData(callback) {
    chrome.storage.local.get(WS_STORAGE_KEY, result => {
      const saved = result[WS_STORAGE_KEY];
      if (saved && Array.isArray(saved.profiles) && saved.profiles.length > 0) {
        wsProfiles       = wsMigrateProfiles(saved.profiles);
        wsLastLaunchedId = saved.lastLaunchedId || null;
        wsRecents        = Array.isArray(saved.recents) ? saved.recents : [];
        app().addLog('info', PLUGIN_ID, 'Workspace Starter: loaded ' + wsProfiles.length + ' profile(s)');
      } else {
        wsSeedDefaults();
      }
      wsDataLoaded = true;
      if (callback) callback();
    });
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function wsValidateUrl(url) {
    const s = url.trim();
    if (!s) return false;
    try {
      const u = new URL(s);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch (_) {
      return false;
    }
  }

  // ── CRUD operations ────────────────────────────────────────────────────────

  function wsCreateProfile(data) {
    const profile = {
      id:         wsGenId(),
      name:       String(data.name || 'New Profile').trim(),
      urls:       (data.urls || []).filter(u => wsValidateUrl(u)).map(u => u.trim()),
      launchMode: data.launchMode || 'tab-group',
      category:   String(data.category || '').trim(),
      favorite:   !!data.favorite,
      createdAt:  Date.now(),
    };
    wsProfiles.push(profile);
    wsSaveProfiles();
    app().addLog('info', PLUGIN_ID, 'Profile created: "' + profile.name + '"');
    app().addNotification('Profile Created', '"' + profile.name + '" saved.', 'success', PLUGIN_ID);
    return profile;
  }

  function wsUpdateProfile(id, data) {
    const idx = wsProfiles.findIndex(p => p.id === id);
    if (idx === -1) return;
    const profile = wsProfiles[idx];
    if (data.name       !== undefined) profile.name       = String(data.name).trim();
    if (data.urls       !== undefined) profile.urls       = data.urls.filter(u => wsValidateUrl(u)).map(u => u.trim());
    if (data.launchMode !== undefined) profile.launchMode = data.launchMode;
    if (data.category   !== undefined) profile.category   = String(data.category || '').trim();
    if (data.favorite   !== undefined) profile.favorite   = !!data.favorite;
    wsSaveProfiles();
    app().addLog('info', PLUGIN_ID, 'Profile updated: "' + profile.name + '"');
    app().addNotification('Profile Updated', '"' + profile.name + '" saved.', 'success', PLUGIN_ID);
  }

  function wsDeleteProfile(id) {
    const profile = wsProfiles.find(p => p.id === id);
    if (!profile) return;
    wsProfiles = wsProfiles.filter(p => p.id !== id);
    wsRecents  = wsRecents.filter(r => r !== id);
    if (wsLastLaunchedId === id) wsLastLaunchedId = null;
    wsSaveProfiles();
    app().addLog('info', PLUGIN_ID, 'Profile deleted: "' + profile.name + '"');
    app().addNotification('Profile Deleted', '"' + profile.name + '" removed.', 'info', PLUGIN_ID);
  }

  function wsDuplicateProfile(id) {
    const src = wsProfiles.find(p => p.id === id);
    if (!src) return;
    const copy = {
      id:         wsGenId(),
      name:       src.name + ' (Copy)',
      urls:       src.urls.slice(),
      launchMode: src.launchMode,
      category:   src.category,
      favorite:   false,
      createdAt:  Date.now(),
    };
    wsProfiles.push(copy);
    wsSaveProfiles();
    app().addLog('info', PLUGIN_ID, 'Profile duplicated: "' + copy.name + '"');
    app().addNotification('Profile Duplicated', '"' + copy.name + '" created.', 'success', PLUGIN_ID);
  }

  function wsToggleFavorite(id) {
    const profile = wsProfiles.find(p => p.id === id);
    if (!profile) return;
    profile.favorite = !profile.favorite;
    wsSaveProfiles();
    app().addLog('info', PLUGIN_ID, 'Favorite toggled for "' + profile.name + '": ' + profile.favorite);
  }

  function wsPushRecent(id) {
    wsSaveRecents(id);
  }

  // ── Date formatting ────────────────────────────────────────────────────────

  function wsFormatShortDate(ts) {
    if (!ts) return '-';
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  // ── Launch profile ─────────────────────────────────────────────────────────

  function wsLaunchProfile(id) {
    const profile = wsProfiles.find(p => p.id === id);
    if (!profile) {
      app().addNotification('Workspace Starter', 'Profile not found.', 'error', PLUGIN_ID);
      return;
    }
    if (!profile.urls || profile.urls.length === 0) {
      app().addNotification('Workspace Starter', 'No URLs in this profile.', 'warning', PLUGIN_ID);
      return;
    }

    const mode = profile.launchMode || 'tab-group';

    if (mode === 'tab-group') {
      // Create all tabs then group them
      const createTabPromises = profile.urls.map(url =>
        new Promise(resolve =>
          chrome.tabs.create({ url, active: false }, tab => resolve(tab))
        )
      );
      Promise.all(createTabPromises).then(tabs => {
        const tabIds = tabs.map(t => t.id);
        if (chrome.tabGroups && chrome.tabs.group) {
          chrome.tabs.group({ tabIds }, groupId => {
            if (!chrome.runtime.lastError && groupId !== undefined) {
              chrome.tabGroups.update(groupId, { title: profile.name, collapsed: false });
            }
          });
        }
        // Bring focus to first tab
        chrome.tabs.update(tabIds[0], { active: true });
      });
    } else {
      // Plain tabs - open all, focus the first
      profile.urls.forEach((url, i) => {
        chrome.tabs.create({ url, active: i === 0 });
      });
    }

    wsSaveLastLaunched(id);
    wsPushRecent(id);
    wsUpdateWidget();

    app().addLog('info', PLUGIN_ID, 'Launched profile "' + profile.name + '" (' + profile.urls.length + ' URL(s), mode: ' + mode + ')');
    app().addNotification(
      'Workspace Launched',
      '"' + profile.name + '" - ' + profile.urls.length + ' tab(s) opened.',
      'success', PLUGIN_ID
    );
  }

  // ── Save current browser window as new profile ─────────────────────────────

  function wsSaveCurrentWindow(callback) {
    chrome.tabs.query({ currentWindow: true }, tabs => {
      const urls = (tabs || [])
        .map(t => t.url)
        .filter(u => u && wsValidateUrl(u));
      if (urls.length === 0) {
        app().addNotification('Workspace Starter', 'No valid URLs found in the current window.', 'warning', PLUGIN_ID);
        if (callback) callback(null);
        return;
      }
      const profile = wsCreateProfile({
        name:       'Window Snapshot ' + wsFormatShortDate(Date.now()),
        urls,
        launchMode: app().getSetting('wsDefaultTabGroups') !== false ? 'tab-group' : 'tabs',
        category:   '',
        favorite:   false,
      });
      if (callback) callback(profile);
    });
  }

  // ── Export / Import ────────────────────────────────────────────────────────

  function wsExportProfile(id) {
    const profile = wsProfiles.find(p => p.id === id);
    if (!profile) return;
    const data = JSON.stringify(profile, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = (profile.name.replace(/[^a-z0-9_-]/gi, '_') || 'profile') + '.ws.json';
    a.click();
    URL.revokeObjectURL(url);
    app().addLog('info', PLUGIN_ID, 'Exported profile: "' + profile.name + '"');
  }

  function wsExportAll() {
    const data = JSON.stringify({ profiles: wsProfiles, exportedAt: Date.now() }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'workspace-profiles.ws.json';
    a.click();
    URL.revokeObjectURL(url);
    app().addLog('info', PLUGIN_ID, 'Exported all ' + wsProfiles.length + ' profile(s)');
    app().addNotification('Profiles Exported', wsProfiles.length + ' profile(s) saved to file.', 'success', PLUGIN_ID);
  }

  function wsImportFromFile(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const parsed = JSON.parse(e.target.result);
        let imported = [];
        if (Array.isArray(parsed)) {
          imported = parsed;
        } else if (parsed.profiles && Array.isArray(parsed.profiles)) {
          imported = parsed.profiles;
        } else if (parsed.id && parsed.urls) {
          imported = [parsed];
        }
        const migrated = wsMigrateProfiles(imported);
        // Re-assign IDs to prevent collisions
        migrated.forEach(p => { p.id = wsGenId(); });
        wsProfiles.push(...migrated);
        wsSaveProfiles();
        app().addLog('info', PLUGIN_ID, 'Imported ' + migrated.length + ' profile(s)');
        app().addNotification('Profiles Imported', migrated.length + ' profile(s) imported.', 'success', PLUGIN_ID);
        if (callback) callback(migrated.length);
      } catch (err) {
        app().addNotification('Workspace Starter', 'Import failed: invalid file format.', 'error', PLUGIN_ID);
        app().addLog('error', PLUGIN_ID, 'Import failed: ' + String(err));
        if (callback) callback(0);
      }
    };
    reader.readAsText(file);
  }

  // ── Sorted profiles / categories ───────────────────────────────────────────

  function wsGetSortedProfiles() {
    return wsProfiles.slice().sort((a, b) => {
      if (a.favorite && !b.favorite) return -1;
      if (!a.favorite && b.favorite) return  1;
      return a.name.localeCompare(b.name);
    });
  }

  function wsGetCategories() {
    const cats = new Set(wsProfiles.map(p => p.category).filter(Boolean));
    return Array.from(cats).sort();
  }

  // ── Widget update ──────────────────────────────────────────────────────────

  function wsUpdateWidget() {
    const countEl  = document.getElementById('ws-widget-count');
    const lastEl   = document.getElementById('ws-widget-last');
    const launchBtn = document.getElementById('ws-widget-launch-btn');
    const favDiv   = document.getElementById('ws-widget-favorites');

    if (countEl) countEl.textContent = wsProfiles.length;

    const lastProfile = wsLastLaunchedId ? wsProfiles.find(p => p.id === wsLastLaunchedId) : null;
    if (lastEl) lastEl.textContent = lastProfile ? lastProfile.name : 'None yet';

    if (launchBtn) {
      launchBtn.disabled = !lastProfile;
      launchBtn.onclick  = lastProfile
        ? () => wsLaunchProfile(lastProfile.id)
        : null;
    }

    // Favorites quick-launch
    if (favDiv) {
      const favorites = wsProfiles.filter(p => p.favorite).slice(0, 3);
      if (favorites.length === 0) {
        favDiv.innerHTML = '<span class="rc-muted ws-widget-empty-hint">No favorites yet - star a profile to see it here.</span>';
      } else {
        favDiv.innerHTML = favorites.map(p =>
          `<button class="rc-btn rc-btn--ghost rc-btn--xs ws-fav-launch-btn"
                   data-profile-id="${app().esc(p.id)}"
                   title="Launch: ${app().esc(p.name)}">${app().esc(p.name)}</button>`
        ).join('');
        favDiv.querySelectorAll('.ws-fav-launch-btn').forEach(btn => {
          btn.addEventListener('click', () => wsLaunchProfile(btn.dataset.profileId));
        });
      }
    }

    // "Open" button in widget
    const openBtn = document.getElementById('ws-widget-open-btn');
    if (openBtn) {
      openBtn.onclick = () => app().navigateTo('plugin-workspace-starter');
    }
  }

  // ── Category badge ─────────────────────────────────────────────────────────

  function wsCategoryBadge(category) {
    if (!category) return '';
    return `<span class="ws-cat-badge">${app().esc(category)}</span>`;
  }

  // ── Render: full plugin view ───────────────────────────────────────────────

  function wsRenderView() {
    const container = document.getElementById('ws-plugin-container');
    if (!container) return;

    if (wsCurrentMode === 'form') {
      wsRenderForm(container);
    } else {
      wsRenderList(container);
    }
  }

  function wsRenderList(container) {
    const sorted   = wsGetSortedProfiles();
    const cats     = wsGetCategories();
    const lastProf = wsLastLaunchedId ? wsProfiles.find(p => p.id === wsLastLaunchedId) : null;

    container.innerHTML = `
      <div class="ws-toolbar">
        <button id="ws-new-btn"           class="rc-btn rc-btn--primary rc-btn--sm"    title="Create a new workspace profile">+ New Profile</button>
        <button id="ws-capture-btn"       class="rc-btn rc-btn--secondary rc-btn--sm"  title="Save all open tabs in the current window as a new profile">Capture Window</button>
        <button id="ws-import-btn"        class="rc-btn rc-btn--ghost rc-btn--sm"      title="Import profile(s) from a .ws.json file">Import</button>
        <button id="ws-export-all-btn"    class="rc-btn rc-btn--ghost rc-btn--sm"      title="Export all profiles to a .ws.json file">Export All</button>
        <input  id="ws-import-file"       type="file" accept=".json" hidden />
        <div class="ws-toolbar-spacer"></div>
        <select id="ws-filter-cat"        class="rc-input rc-input--sm" style="max-width:130px;" title="Filter profiles by category">
          <option value="">All categories</option>
          ${cats.map(c => `<option value="${app().esc(c)}">${app().esc(c)}</option>`).join('')}
        </select>
        <input  id="ws-filter-search"     class="rc-input rc-input--sm" placeholder="Search…" style="max-width:140px;" title="Filter profiles by name" />
      </div>

      ${lastProf ? `
      <div class="rc-last-launched">
        <span class="rc-last-launched__name">${app().esc(lastProf.name)}</span>
        <button class="rc-btn rc-btn--primary rc-btn--xs ws-relaunch-btn" data-id="${app().esc(lastProf.id)}" title="Re-launch this profile">▶ Relaunch</button>
      </div>` : ''}

      <div id="ws-profile-list" class="ws-profile-list"></div>
    `;

    // Bind toolbar
    document.getElementById('ws-new-btn')?.addEventListener('click', () => {
      wsCurrentMode = 'form';
      wsEditingId   = null;
      wsRenderView();
    });

    document.getElementById('ws-capture-btn')?.addEventListener('click', () => {
      wsSaveCurrentWindow(profile => {
        if (profile) wsRenderView();
      });
    });

    document.getElementById('ws-export-all-btn')?.addEventListener('click', wsExportAll);

    const importBtn  = document.getElementById('ws-import-btn');
    const importFile = document.getElementById('ws-import-file');
    importBtn?.addEventListener('click', () => importFile.click());
    importFile?.addEventListener('change', function() {
      if (this.files && this.files[0]) {
        wsImportFromFile(this.files[0], count => {
          if (count > 0) wsRenderView();
          this.value = '';
        });
      }
    });

    container.querySelector('.ws-relaunch-btn')?.addEventListener('click', function() {
      wsLaunchProfile(this.dataset.id);
    });

    // Populate list with filter
    let filterSearch = '';
    let filterCat    = '';

    function applyFilters() {
      const q   = filterSearch.toLowerCase();
      const cat = filterCat;
      const list = document.getElementById('ws-profile-list');
      if (!list) return;
      const visible = sorted.filter(p =>
        (!q   || p.name.toLowerCase().includes(q) || p.urls.join(' ').toLowerCase().includes(q)) &&
        (!cat || p.category === cat)
      );
      renderProfileCards(list, visible);
    }

    document.getElementById('ws-filter-search')?.addEventListener('input', function() {
      filterSearch = this.value.trim();
      applyFilters();
    });
    document.getElementById('ws-filter-cat')?.addEventListener('change', function() {
      filterCat = this.value;
      applyFilters();
    });

    applyFilters();
  }

  function renderProfileCards(listEl, profiles) {
    if (profiles.length === 0) {
      listEl.innerHTML = '<div class="rc-plugin-empty rc-plugin-empty--compact"><p class="rc-plugin-empty__body">No profiles match the current filter.</p></div>';
      return;
    }

    listEl.innerHTML = profiles.map(p => `
      <div class="ws-profile-card" data-id="${app().esc(p.id)}">
        <div class="ws-profile-card__header">
          <span class="ws-fav-toggle ws-fav-btn" data-id="${app().esc(p.id)}" title="${p.favorite ? 'Unstar' : 'Star'} this profile" aria-label="${p.favorite ? 'Unstar' : 'Star'} ${p.name}" role="button" tabindex="0">${p.favorite ? '&#9733;' : '&#9734;'}</span>
          <strong class="ws-profile-card__name">${app().esc(p.name)}</strong>
          ${wsCategoryBadge(p.category)}
          <span class="ws-profile-card__mode ws-mode-badge">${p.launchMode === 'tab-group' ? 'Group' : 'Tabs'}</span>
        </div>
        <div class="ws-profile-card__urls">
          ${p.urls.slice(0, 4).map(u => `<div class="ws-url-line rc-muted" title="${app().esc(u)}">${app().esc(u.replace(/^https?:\/\//, ''))}</div>`).join('')}
          ${p.urls.length > 4 ? `<div class="ws-url-more rc-muted">...and ${p.urls.length - 4} more</div>` : ''}
        </div>
        <div class="ws-profile-card__footer">
          <span class="ws-profile-card__meta rc-muted">Created ${wsFormatShortDate(p.createdAt)} · ${p.urls.length} URL${p.urls.length !== 1 ? 's' : ''}</span>
          <div class="ws-card-actions">
            <button class="rc-btn rc-btn--primary rc-btn--xs ws-launch-btn"     data-id="${app().esc(p.id)}" title="Launch profile: open ${p.urls.length} tab(s)">▶ Launch</button>
            <button class="rc-btn rc-btn--ghost   rc-btn--xs ws-edit-btn"       data-id="${app().esc(p.id)}" title="Edit this profile">Edit</button>
            <button class="rc-btn rc-btn--ghost   rc-btn--xs ws-dup-btn"        data-id="${app().esc(p.id)}" title="Duplicate this profile">Dup</button>
            <button class="rc-btn rc-btn--ghost   rc-btn--xs ws-export-one-btn" data-id="${app().esc(p.id)}" title="Export this profile to a JSON file">Export</button>
            <button class="rc-btn rc-btn--danger  rc-btn--xs ws-delete-btn"     data-id="${app().esc(p.id)}" title="Delete this profile">Delete</button>
          </div>
        </div>
      </div>
    `).join('');

    // Wire card buttons
    listEl.querySelectorAll('.ws-launch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        wsLaunchProfile(btn.dataset.id);
        wsUpdateWidget();
      });
    });
    listEl.querySelectorAll('.ws-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        wsCurrentMode = 'form';
        wsEditingId   = btn.dataset.id;
        wsRenderView();
      });
    });
    listEl.querySelectorAll('.ws-dup-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        wsDuplicateProfile(btn.dataset.id);
        wsRenderView();
      });
    });
    listEl.querySelectorAll('.ws-export-one-btn').forEach(btn => {
      btn.addEventListener('click', () => wsExportProfile(btn.dataset.id));
    });
    listEl.querySelectorAll('.ws-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = wsProfiles.find(x => x.id === btn.dataset.id);
        if (p && confirm('Delete profile "' + p.name + '"?')) {
          wsDeleteProfile(btn.dataset.id);
          wsUpdateWidget();
          wsRenderView();
        }
      });
    });
    listEl.querySelectorAll('.ws-fav-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        wsToggleFavorite(btn.dataset.id);
        wsUpdateWidget();
        wsRenderView();
      });
    });
  }

  // ── Render: form (new / edit) ──────────────────────────────────────────────

  function wsRenderForm(container) {
    const editing   = wsEditingId ? wsProfiles.find(p => p.id === wsEditingId) : null;
    const isNew     = !editing;
    const name      = editing ? editing.name      : '';
    const launchMode = editing ? editing.launchMode : (app().getSetting('wsDefaultTabGroups') !== false ? 'tab-group' : 'tabs');
    const category  = editing ? editing.category  : '';
    const favorite  = editing ? editing.favorite  : false;
    const urls      = editing ? editing.urls      : [''];

    container.innerHTML = `
      <div class="ws-form-header">
        <button id="ws-form-back" class="rc-btn rc-btn--ghost rc-btn--sm" title="Go back to the profile list">← Back</button>
        <h2 class="ws-form-title">${isNew ? 'New Profile' : 'Edit: ' + app().esc(name)}</h2>
      </div>

      <div id="ws-form-error" class="rc-status rc-status--error" hidden></div>

      <div class="ws-form-group">
        <label class="rc-label" for="ws-form-name">Profile Name</label>
        <input id="ws-form-name" class="rc-input" type="text" maxlength="80"
               value="${app().esc(name)}" placeholder="e.g. Support Morning"
               title="Name of this workspace profile" />
      </div>

      <div class="ws-form-group">
        <label class="rc-label" for="ws-form-category">Category</label>
        <input id="ws-form-category" class="rc-input" type="text" maxlength="40"
               value="${app().esc(category)}" placeholder="e.g. Support, Cloud…"
               title="Optional category tag for grouping" />
      </div>

      <div class="ws-form-group">
        <label class="rc-label" for="ws-form-launchmode">Launch Mode <span class="rc-muted" style="font-size:11px;font-weight:400;">- how tabs are opened when launching</span></label>
        <select id="ws-form-launchmode" class="rc-input rc-input--sm" title="How to open the tabs when launching this profile">
          <option value="tab-group" ${launchMode === 'tab-group' ? 'selected' : ''}>Tab Group (grouped)</option>
          <option value="tabs"      ${launchMode === 'tabs'      ? 'selected' : ''}>Plain Tabs</option>
        </select>
      </div>

      <div class="ws-form-group">
        <label class="rc-label">Favorite</label>
        <label class="rc-toggle" title="Star this profile so it appears in widget quick-launch">
          <input type="checkbox" class="rc-toggle__input" id="ws-form-favorite" ${favorite ? 'checked' : ''} />
          <span class="rc-toggle__slider"></span>
        </label>
      </div>

      <div class="ws-urls-section">
        <div class="ws-urls-header">
          <span class="ws-urls-title">URLs</span>
          <button id="ws-add-url-btn" class="rc-btn rc-btn--ghost rc-btn--xs" title="Add another URL to this profile">+ Add URL</button>
        </div>
        <div id="ws-url-rows">
          ${urls.map((url, i) => wsUrlRowHtml(url, i)).join('')}
        </div>
      </div>

      <div class="ws-form-footer">
        <button id="ws-form-save"   class="rc-btn rc-btn--primary"  title="${isNew ? 'Create' : 'Save'} this profile">${isNew ? 'Create' : 'Save'}</button>
        <button id="ws-form-cancel" class="rc-btn rc-btn--ghost"     title="Cancel and return to the profile list">Cancel</button>
      </div>
    `;

    // Wire URL rows
    wsBindUrlRows(container);

    // Back / cancel
    document.getElementById('ws-form-back')?.addEventListener('click', () => {
      wsCurrentMode = 'list'; wsEditingId = null; wsRenderView();
    });
    document.getElementById('ws-form-cancel')?.addEventListener('click', () => {
      wsCurrentMode = 'list'; wsEditingId = null; wsRenderView();
    });

    // Add URL row
    document.getElementById('ws-add-url-btn')?.addEventListener('click', () => {
      const rowsEl = document.getElementById('ws-url-rows');
      if (!rowsEl) return;
      const idx   = rowsEl.querySelectorAll('.ws-url-row').length;
      const div   = document.createElement('div');
      div.innerHTML = wsUrlRowHtml('', idx);
      rowsEl.appendChild(div.firstElementChild);
      wsBindUrlRows(container);
    });

    // Save
    document.getElementById('ws-form-save')?.addEventListener('click', () => wsSubmitForm(container));
  }

  function wsUrlRowHtml(url, idx) {
    return `
      <div class="ws-url-row">
        <input class="rc-input ws-url-input" type="url" value="${app().esc(url)}"
               placeholder="https://example.com"
               data-idx="${idx}"
               title="URL to open when launching this profile (must begin with https:// or http://)" />
        <button class="rc-btn rc-btn--ghost rc-btn--xs ws-url-remove" title="Remove this URL" aria-label="Remove this URL">×</button>
      </div>`;
  }

  function wsBindUrlRows(container) {
    container.querySelectorAll('.ws-url-remove').forEach(btn => {
      btn.onclick = () => {
        const row = btn.closest('.ws-url-row');
        if (!row) return;
        const rowsEl = document.getElementById('ws-url-rows');
        if (rowsEl && rowsEl.querySelectorAll('.ws-url-row').length > 1) {
          row.remove();
        } else {
          // Keep at least one row, just clear it
          const inp = row.querySelector('.ws-url-input');
          if (inp) inp.value = '';
        }
      };
    });
  }

  function wsSubmitForm(container) {
    const errEl     = document.getElementById('ws-form-error');
    const nameInput = document.getElementById('ws-form-name');
    const catInput  = document.getElementById('ws-form-category');
    const modeInput = document.getElementById('ws-form-launchmode');
    const favInput  = document.getElementById('ws-form-favorite');
    const urlInputs = container.querySelectorAll('.ws-url-input');

    const name      = (nameInput?.value || '').trim();
    const category  = (catInput?.value  || '').trim();
    const launchMode = modeInput?.value || 'tab-group';
    const favorite  = !!favInput?.checked;
    const urls      = Array.from(urlInputs).map(i => i.value.trim()).filter(Boolean);

    if (!name) {
      wsShowFormError(errEl, 'Profile name is required.');
      nameInput?.focus();
      return;
    }
    const invalidUrls = urls.filter(u => !wsValidateUrl(u));
    if (invalidUrls.length > 0) {
      wsShowFormError(errEl, 'Some URLs are invalid: ' + invalidUrls.slice(0, 2).join(', '));
      return;
    }
    if (urls.length === 0) {
      wsShowFormError(errEl, 'Add at least one URL.');
      return;
    }

    if (wsEditingId) {
      wsUpdateProfile(wsEditingId, { name, urls, launchMode, category, favorite });
    } else {
      wsCreateProfile({ name, urls, launchMode, category, favorite });
    }

    wsUpdateWidget();
    wsCurrentMode = 'list';
    wsEditingId   = null;
    wsRenderView();
  }

  function wsShowFormError(errEl, msg) {
    if (!errEl) return;
    errEl.textContent = msg;
    errEl.removeAttribute('hidden');
    setTimeout(() => { if (errEl) errEl.setAttribute('hidden', ''); }, 5000);
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const plugin = {
    id: PLUGIN_ID,

    init(currentView) {
      wsLoadData(() => {
        wsUpdateWidget();
        // Always render the view from the init callback.
        //
        // Startup race: dashboard.js calls init() at Step 3b with currentView
        // still set to 'dashboard', then calls navigateTo(lastView) at Step 15.
        // When plugin-workspace-starter is the restored view, navigateTo fires
        // render() - but wsLoadData is async and may not have finished yet, so
        // render() returns early (wsDataLoaded is false) and the list stays empty.
        //
        // The data always finishes loading AFTER navigateTo has already set
        // rc-view--active on the container.  By always rendering here we
        // guarantee profiles appear whether the user opens directly into the
        // Workspace Starter view or navigates to it later.
        //
        // wsRenderView() writes into #ws-plugin-container which is always
        // present in the DOM regardless of which view is currently visible,
        // so rendering into a non-active view is harmless.
        wsRenderView();
        app().addLog('info', PLUGIN_ID, 'Workspace Starter initialised - ' + wsProfiles.length + ' profile(s) loaded');
      });
    },

    render() {
      // If data is already loaded, render immediately.
      // If not yet loaded, the init() callback will render when data arrives.
      if (wsDataLoaded) {
        wsRenderView();
      }
    },
  };

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.WorkspaceStarter = plugin;
})();
