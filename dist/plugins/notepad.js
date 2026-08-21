/**
 * Quick Note Pad - ReplyCators Plugin
 * v1.0.0
 *
 * Persistent multi-tab notepad. Notes survive popup close, browser restart,
 * and session boundaries via chrome.storage.local.
 *
 * Features:
 *   - Up to 5 named note tabs
 *   - Auto-save on every keystroke (300 ms debounce)
 *   - Per-tab title editing (double-click or pencil icon)
 *   - Copy-to-clipboard action per tab
 *   - Export active note as .txt
 *   - New note / delete note actions
 *   - Character counter per tab
 *   - Monospace toggle (Notepad++ inspired)
 *   - Dashboard widget shows active note preview + quick-open
 *
 * Plugin ID:  com.replycators.notepad
 * View ID:    plugin-notepad
 * Category:   productivity
 *
 * Storage keys (all chrome.storage.local):
 *   rc:plugin:com.replycators.notepad:notes
 *   rc:plugin:com.replycators.notepad:state
 */

(function () {
  'use strict';

  const PLUGIN_ID = 'com.replycators.notepad';
  const MAX_NOTES = 5;

  const STORE = {
    NOTES: 'rc:plugin:' + PLUGIN_ID + ':notes',
    STATE: 'rc:plugin:' + PLUGIN_ID + ':state',
  };

  // ── In-memory state ─────────────────────────────────────────────────────────

  let _notes       = [];   // [{ id, title, body, updatedAt }]
  let _activeId    = null; // currently visible note ID
  let _saveTimer   = null; // debounce handle
  let _rendered    = false;
  let _monoMode    = false; // monospace font toggle

  function app() { return window.ReplyCatorsApp; }

  // ── ID generation ────────────────────────────────────────────────────────────

  function _genId() {
    return 'np-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  // ── Persistence helpers ──────────────────────────────────────────────────────

  function _storageSet(data) {
    chrome.storage.local.set(data, function () {
      if (chrome.runtime.lastError) {
        const a = app();
        if (a) a.addLog('error', PLUGIN_ID, 'notepad storage write failed: ' + chrome.runtime.lastError.message);
      }
    });
  }

  function _storageGet(keys, cb) {
    chrome.storage.local.get(keys, function (result) {
      if (chrome.runtime.lastError) {
        const a = app();
        if (a) a.addLog('error', PLUGIN_ID, 'notepad storage read failed: ' + chrome.runtime.lastError.message);
        cb({});
        return;
      }
      cb(result);
    });
  }

  function _saveNotes() {
    _storageSet({ [STORE.NOTES]: _notes });
  }

  function _saveState() {
    _storageSet({ [STORE.STATE]: { activeId: _activeId, monoMode: _monoMode } });
  }

  // Debounced body save - called on every keystroke
  function _debounceSave() {
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(function () {
      _saveNotes();
    }, 300);
  }

  // ── Default seed ─────────────────────────────────────────────────────────────

  function _seedDefault() {
    _notes = [
      {
        id:        _genId(),
        title:     'Note 1',
        body:      '',
        updatedAt: new Date().toISOString(),
      },
    ];
    _activeId = _notes[0].id;
    _saveNotes();
    _saveState();
  }

  // ── Data load ────────────────────────────────────────────────────────────────

  function _loadData(cb) {
    _storageGet([STORE.NOTES, STORE.STATE], function (result) {
      const rawNotes = result[STORE.NOTES];
      const rawState = result[STORE.STATE] || {};

      if (Array.isArray(rawNotes) && rawNotes.length > 0) {
        // Migrate / validate each note entry
        _notes = rawNotes.slice(0, MAX_NOTES).map(function (n) {
          return {
            id:        n.id        || _genId(),
            title:     (typeof n.title === 'string' && n.title.trim()) ? n.title.trim() : 'Untitled',
            body:      typeof n.body === 'string' ? n.body : '',
            updatedAt: n.updatedAt || new Date().toISOString(),
          };
        });
      } else {
        _seedDefault();
      }

      _monoMode = !!rawState.monoMode;

      // Restore active tab, falling back to first note
      const savedActive = rawState.activeId;
      const found = _notes.find(function (n) { return n.id === savedActive; });
      _activeId = found ? found.id : _notes[0].id;

      if (cb) cb();
    });
  }

  // ── Note CRUD ────────────────────────────────────────────────────────────────

  function _activeNote() {
    return _notes.find(function (n) { return n.id === _activeId; }) || _notes[0];
  }

  function _addNote() {
    if (_notes.length >= MAX_NOTES) {
      app().showToast('Maximum of ' + MAX_NOTES + ' notes reached. Delete a note to create a new one.', 'warning');
      return;
    }
    const note = {
      id:        _genId(),
      title:     'Note ' + (_notes.length + 1),
      body:      '',
      updatedAt: new Date().toISOString(),
    };
    _notes.push(note);
    _activeId = note.id;
    _saveNotes();
    _saveState();
    _renderFull();
    app().addLog('info', PLUGIN_ID, 'New note created: ' + note.id);
    app().addNotification('Quick Note Pad', 'Note "' + note.title + '" created.', 'success', PLUGIN_ID);
  }

  function _deleteNote(id) {
    if (_notes.length <= 1) {
      app().showToast('Cannot delete the last note.', 'warning');
      return;
    }
    const idx = _notes.findIndex(function (n) { return n.id === id; });
    if (idx === -1) return;
    const deletedTitle = _notes[idx].title;
    _notes.splice(idx, 1);
    // Switch active to the note before the deleted one, or the first
    const newActive = _notes[Math.max(0, idx - 1)];
    _activeId = newActive.id;
    _saveNotes();
    _saveState();
    _renderFull();
    app().addLog('info', PLUGIN_ID, 'Note deleted: ' + id);
    app().addNotification('Quick Note Pad', 'Note "' + deletedTitle + '" deleted.', 'info', PLUGIN_ID);
  }

  // ── Clipboard ────────────────────────────────────────────────────────────────

  function _copyActiveNote() {
    const note = _activeNote();
    if (!note) return;
    const text = note.body;
    if (!text.trim()) {
      app().showToast('Nothing to copy - note is empty.', 'info');
      return;
    }
    navigator.clipboard.writeText(text).then(function () {
      app().addNotification('Quick Note Pad', '"' + note.title + '" copied to clipboard.', 'success', PLUGIN_ID);
      app().addLog('info', PLUGIN_ID, 'Note copied: ' + note.id);
    }).catch(function () {
      app().showToast('Clipboard copy failed.', 'warning');
    });
  }

  // ── Export ───────────────────────────────────────────────────────────────────

  function _exportActiveNote() {
    const note = _activeNote();
    if (!note) return;
    const filename = note.title.replace(/[^a-z0-9_\-. ]/gi, '_').replace(/\s+/g, '_') + '.txt';
    const blob = new Blob([note.body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    app().addLog('info', PLUGIN_ID, 'Note exported: ' + filename);
    app().addNotification('Quick Note Pad', '"' + note.title + '" exported as ' + filename, 'success', PLUGIN_ID);
  }

  // ── Rendering ────────────────────────────────────────────────────────────────

  function _buildHTML() {
    const note = _activeNote();

    const tabsHtml = _notes.map(function (n) {
      const isActive = n.id === _activeId;
      return '<button class="rc-plugin-tab' + (isActive ? ' rc-plugin-tab--active' : '') + '"' +
             ' data-np-tab="' + n.id + '"' +
             ' role="tab"' +
             ' aria-selected="' + isActive + '"' +
             ' title="' + _escHtml(n.title) + '">' +
             _escHtml(_truncate(n.title, 14)) +
             '</button>';
    }).join('');

    const addTabBtn = _notes.length < MAX_NOTES
      ? '<button id="np-add-note" class="rc-plugin-tab np-add-tab-btn" title="New note" aria-label="New note">+</button>'
      : '';

    const charCount = note ? note.body.length : 0;
    const monoClass = _monoMode ? ' rc-textarea--mono' : '';
    const monoLabel = _monoMode ? 'Plain' : 'Mono';

    return (
      '<div id="np-root" class="np-root">' +

        // Tab bar
        '<div class="rc-plugin-tabs" role="tablist" aria-label="Notes" id="np-tabbar">' +
          tabsHtml +
          addTabBtn +
        '</div>' +

        // Toolbar — title input on left, actions on right
        '<div class="np-toolbar rc-plugin-action-bar" id="np-toolbar">' +
          '<input id="np-title-input" class="rc-input rc-input--sm np-title-input" type="text"' +
          ' value="' + _escHtml(note ? note.title : '') + '"' +
          ' maxlength="40"' +
          ' title="Note title - press Enter or click away to confirm"' +
          ' aria-label="Note title" />' +
          '<div class="rc-plugin-action-bar__spacer"></div>' +
          '<span id="np-char-count" class="np-char-count rc-results-meta" aria-live="polite" aria-atomic="true">' + charCount + ' chars</span>' +
          '<button id="np-mono-btn" class="rc-btn rc-btn--ghost rc-btn--sm" title="Toggle monospace font">' + monoLabel + '</button>' +
          '<button id="np-copy-btn" class="rc-btn rc-btn--ghost rc-btn--sm" title="Copy note to clipboard">&#8889; Copy</button>' +
          '<button id="np-export-btn" class="rc-btn rc-btn--ghost rc-btn--sm" title="Export note as .txt file">&#8595; Export</button>' +
          '<button id="np-delete-btn" class="rc-btn rc-btn--danger rc-btn--sm" title="Delete this note" aria-label="Delete this note">&#215; Delete</button>' +
        '</div>' +

        // Textarea
        '<div class="np-body-wrap">' +
          '<textarea id="np-body"' +
          ' class="rc-textarea np-textarea' + monoClass + '"' +
          ' placeholder="Start typing..."' +
          ' aria-label="Note body"' +
          ' spellcheck="true">' +
          _escHtml(note ? note.body : '') +
          '</textarea>' +
        '</div>' +

      '</div>'
    );
  }

  function _escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _truncate(str, max) {
    return str.length <= max ? str : str.slice(0, max - 1) + '\u2026';
  }

  function _renderFull() {
    const container = document.getElementById('np-container');
    if (!container) return;
    container.innerHTML = _buildHTML();
    _bindEvents();
    _rendered = true;
    _updateWidget();
  }

  function _bindEvents() {
    // Tab switching
    const tabBar = document.getElementById('np-tabbar');
    if (tabBar) {
      tabBar.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-np-tab]');
        if (!btn) return;
        const id = btn.dataset.npTab;
        if (id && id !== _activeId) {
          _flushCurrentBody();
          _activeId = id;
          _saveState();
          _renderFull();
        }
      });
    }

    // Add note button
    document.getElementById('np-add-note')?.addEventListener('click', _addNote);

    // Title input
    const titleInput = document.getElementById('np-title-input');
    if (titleInput) {
      titleInput.addEventListener('change', function () { _commitTitle(titleInput.value); });
      titleInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { titleInput.blur(); }
      });
    }

    // Body textarea
    const body = document.getElementById('np-body');
    if (body) {
      body.addEventListener('input', function () {
        const note = _activeNote();
        if (!note) return;
        note.body = body.value;
        note.updatedAt = new Date().toISOString();
        _updateCharCount(body.value.length);
        _debounceSave();
        _updateWidget();
      });
    }

    // Action buttons
    document.getElementById('np-copy-btn')?.addEventListener('click', _copyActiveNote);
    document.getElementById('np-export-btn')?.addEventListener('click', _exportActiveNote);
    document.getElementById('np-delete-btn')?.addEventListener('click', function () {
      _flushCurrentBody();
      _deleteNote(_activeId);
    });
    document.getElementById('np-mono-btn')?.addEventListener('click', function () {
      _flushCurrentBody();
      _monoMode = !_monoMode;
      _saveState();
      _renderFull();
    });
  }

  function _commitTitle(raw) {
    const note = _activeNote();
    if (!note) return;
    const trimmed = (raw || '').trim();
    note.title = trimmed || 'Untitled';
    _saveNotes();
    // Update only the active tab button label without a full re-render
    const activeTab = document.querySelector('[data-np-tab="' + _activeId + '"]');
    if (activeTab) {
      activeTab.textContent = _truncate(note.title, 14);
      activeTab.title = note.title;
    }
  }

  function _flushCurrentBody() {
    const body = document.getElementById('np-body');
    if (!body) return;
    const note = _activeNote();
    if (!note) return;
    note.body = body.value;
    note.updatedAt = new Date().toISOString();
  }

  function _updateCharCount(n) {
    const el = document.getElementById('np-char-count');
    if (el) el.textContent = n + ' chars';
  }

  // ── Widget update ────────────────────────────────────────────────────────────

  function _updateWidget() {
    const note = _activeNote();
    const preview = document.getElementById('np-widget-preview');
    if (!preview) return;
    if (!note || !note.body.trim()) {
      preview.textContent = 'No notes yet. Click Open to start.';
      return;
    }
    // Show first 80 chars of active note body
    const lines = note.body.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
    const snippet = lines.join(' - ').slice(0, 80);
    preview.textContent = (snippet.length >= 80 ? snippet + '...' : snippet);
  }

  // ── Plugin lifecycle ─────────────────────────────────────────────────────────

  function init() {
    // Wire widget buttons - IDs exist in dashboard.html at init time
    document.getElementById('np-widget-open-btn')?.addEventListener('click', function () {
      app().navigateTo('plugin-notepad');
    });
  }

  function onNavigate() {
    const container = document.getElementById('np-container');
    if (!container) return;

    if (!_rendered || _notes.length === 0) {
      container.innerHTML = '<div class="rc-plugin-loading">Loading notes...</div>';
      _loadData(function () {
        _renderFull();
      });
    } else {
      // Re-render to pick up any state changes since last visit
      _renderFull();
    }

    app().addLog('info', PLUGIN_ID, 'Quick Note Pad opened');
  }

  function onLeave() {
    // Flush any pending debounce writes immediately on navigation away
    if (_saveTimer) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
      _flushCurrentBody();
      _saveNotes();
    }
    app().addLog('info', PLUGIN_ID, 'Quick Note Pad closed');
  }

  // ── Self-registration ────────────────────────────────────────────────────────

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.Notepad = { id: PLUGIN_ID, init, onNavigate, onLeave };

})();
