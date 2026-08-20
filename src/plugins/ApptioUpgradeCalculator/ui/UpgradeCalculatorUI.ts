/**
 * UpgradeCalculatorUI.ts
 *
 * Dashboard UI for the Apptio Planning Upgrade Calculator plugin.
 * Rendered inside the plugin view container (lazy, once per container lifecycle).
 *
 * Tabs:
 *   - Next Release  — shows latest released + next upcoming release
 *   - Calculator    — dual Major/Minor dropdowns; known or unknown upgrade day
 *   - Schedule      — recent-first table (latest 10 by default, historical toggle)
 *
 * Persistence (via ReplyCators StorageManager under rc:plugin:<id>:):
 *   last-calc   — { majorVersion, minorVersion, upgradeDay, tab } — restored on open
 *
 * Version dropdowns are always built from parsed release data.
 * No major-version values are hardcoded anywhere.
 */

import type { PluginContext } from '@replycators/sdk';
import {
  getSchedule, refreshSchedule,
  parseDate, addDays, subtractDays,
  firstWeekdayOnOrAfter, daysBetween, formatDate,
  DAY_NAMES,
  type Schedule,
  type ReleaseEntry,
} from '../UpgradeScheduleService';

const PLUGIN_ID  = 'com.replycators.apptio-planning-upgrade-calculator';
const PREFS_KEY  = 'last-calc';
const CACHE_MS   = 24 * 60 * 60 * 1000;

/** Number of releases shown in the schedule table before "show historical" is toggled on. */
const SCHEDULE_DEFAULT_COUNT = 10;

interface Prefs {
  majorVersion: string; // e.g. "5"
  minorVersion: string; // e.g. "30"
  upgradeDay:   string; // "0"–"6" or "unknown"
  tab:          string; // "next" | "calc" | "schedule"
}

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c)
  );
}

export function renderUpgradeCalculatorUI(container: HTMLElement, ctx: PluginContext): void {
  container.innerHTML = getHTML();
  bindEvents(container, ctx);
}

// ─── HTML Template ────────────────────────────────────────────────────────────

function getHTML(): string {
  return `
    <div class="rc-panel-header">
      <span class="rc-panel-title">📅 Apptio Planning Upgrade Calculator</span>
      <span class="rc-badge rc-badge--blue">Enterprise</span>
    </div>
    <div class="rc-panel-body">

      <!-- Status / source bar -->
      <div id="auc-status-bar" class="rc-status rc-status--neutral" style="margin-bottom:12px;display:none;"></div>

      <!-- Tab navigation -->
      <div class="rc-section-header-row" style="border-bottom:1px solid var(--rc-border);padding-bottom:8px;">
        <button id="auc-tab-next"     class="rc-btn rc-btn--ghost rc-btn--sm" title="Next Release — shows the latest released and next upcoming Apptio Planning release">📋 Next Release</button>
        <button id="auc-tab-calc"     class="rc-btn rc-btn--ghost rc-btn--sm" title="Calculator — calculate upgrade dates for a specific release">🔢 Calculator</button>
        <button id="auc-tab-schedule" class="rc-btn rc-btn--ghost rc-btn--sm" title="Full Release Schedule — browse releases with dates and status">📅 Schedule</button>
        <div style="flex:1;"></div>
        <button id="auc-refresh-btn" class="rc-btn rc-btn--secondary rc-btn--sm"
                title="Force refresh — clears the cache and re-fetches the IBM Community schedule">🔄 Refresh</button>
      </div>

      <!-- Loading state -->
      <div id="auc-loading" class="rc-status rc-status--neutral">⏳ Loading schedule…</div>

      <!-- ── Tab: Next Release ─────────────────────────────────────────── -->
      <div id="auc-tab-panel-next" style="display:none;">
        <div id="auc-next-content" style="display:flex;flex-wrap:wrap;gap:10px;"></div>
      </div>

      <!-- ── Tab: Calculator ──────────────────────────────────────────── -->
      <div id="auc-tab-panel-calc" style="display:none;">

        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px;">

          <!-- Major Release dropdown -->
          <div style="flex:1;min-width:100px;">
            <label class="rc-label" for="auc-select-major"
                   title="Select the major Apptio Planning release series (e.g. 5, 6, 7). Populated automatically from schedule data — no hardcoded values.">Major Release</label>
            <select id="auc-select-major" class="rc-input"
                    title="Choose the major release series. Options are derived entirely from the fetched IBM schedule.">
              <option value="">— major —</option>
            </select>
          </div>

          <!-- Minor Release dropdown -->
          <div style="flex:1;min-width:100px;">
            <label class="rc-label" for="auc-select-minor"
                   title="Select the specific release within the chosen major series (e.g. 28, 30). Updates automatically when Major Release changes.">Minor Release</label>
            <select id="auc-select-minor" class="rc-input"
                    title="Choose the specific minor release. Options update based on the selected major release.">
              <option value="">— minor —</option>
            </select>
          </div>

          <!-- Upgrade Day dropdown -->
          <div style="flex:1;min-width:140px;">
            <label class="rc-label" for="auc-select-day"
                   title="The day of the week on which the customer's upgrade is scheduled, or Unknown if not known">Upgrade Day</label>
            <select id="auc-select-day" class="rc-input"
                    title="Select the customer's scheduled upgrade day, or choose Unknown to see the full upgrade window">
              <option value="unknown">Unknown</option>
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>

        </div>

        <!-- Known day results -->
        <div id="auc-results-known" class="rc-section-block" style="display:none;margin-bottom:10px;">
          <div style="font-weight:600;font-size:12px;margin-bottom:8px;">Upgrade Timeline</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            <div class="auc-stat" title="Date Apptio Planning sandbox will be upgraded to this release">
              <span class="auc-stat-label">Sandbox Date</span>
              <span class="auc-stat-value" id="auc-res-sandbox-date">—</span>
            </div>
            <div class="auc-stat" title="Date Apptio Planning production will be upgraded to this release">
              <span class="auc-stat-label">Production Date</span>
              <span class="auc-stat-value" id="auc-res-prod-date">—</span>
            </div>
            <div class="auc-stat" title="Expected date this customer's environment will be upgraded (first occurrence of upgrade day on or after production date)">
              <span class="auc-stat-label">Expected Upgrade</span>
              <span class="auc-stat-value rc-text-accent" id="auc-res-upgrade-date">—</span>
            </div>
            <div class="auc-stat" title="Number of calendar days until the expected upgrade date">
              <span class="auc-stat-label">Days Remaining</span>
              <span class="auc-stat-value" id="auc-res-days-remaining">—</span>
            </div>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="auc-copy-summary-k" class="rc-btn rc-btn--secondary rc-btn--sm"
                    title="Copy a concise technical summary of the upgrade dates to the clipboard">📋 Copy Summary</button>
            <button id="auc-copy-response-k" class="rc-btn rc-btn--secondary rc-btn--sm"
                    title="Copy a professional customer-facing response about the upgrade timeline to the clipboard">✉️ Copy Response</button>
          </div>
        </div>

        <!-- Unknown day results -->
        <div id="auc-results-unknown" class="rc-section-block" style="display:none;margin-bottom:10px;">
          <div style="font-weight:600;font-size:12px;margin-bottom:8px;">Upgrade Window (Unknown Day)</div>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
            <div class="auc-stat" title="Date the Apptio Planning sandbox will be upgraded">
              <span class="auc-stat-label">Sandbox Date</span>
              <span class="auc-stat-value" id="auc-res-sandbox-date-u">—</span>
            </div>
            <div class="auc-stat" title="Date the Apptio Planning production environment will be upgraded">
              <span class="auc-stat-label">Production Date</span>
              <span class="auc-stat-value" id="auc-res-prod-date-u">—</span>
            </div>
          </div>
          <div style="margin-bottom:10px;">
            <div style="font-size:11px;font-weight:600;margin-bottom:4px;color:var(--rc-text-muted);"
                 title="All possible upgrade days in the week beginning on the production release date — each row is a potential upgrade day">
              Possible Upgrade Window (7 days from production):
            </div>
            <table id="auc-table-upgrade-window" style="width:100%;font-size:11px;border-collapse:collapse;">
              <thead><tr>
                <th style="text-align:left;padding:3px 6px;border-bottom:1px solid var(--rc-border);">Day</th>
                <th style="text-align:left;padding:3px 6px;border-bottom:1px solid var(--rc-border);">Date</th>
              </tr></thead>
              <tbody></tbody>
            </table>
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="auc-copy-summary-u" class="rc-btn rc-btn--secondary rc-btn--sm"
                    title="Copy a concise technical summary of the upgrade window to the clipboard">📋 Copy Summary</button>
            <button id="auc-copy-response-u" class="rc-btn rc-btn--secondary rc-btn--sm"
                    title="Copy a professional customer-facing response explaining the upgrade window to the clipboard">✉️ Copy Response</button>
          </div>
        </div>

        <!-- No selection prompt -->
        <div id="auc-calc-prompt" class="rc-status rc-status--neutral" style="display:none;">
          Select a Major Release and Minor Release above to see upgrade calculations.
        </div>

        <!-- Help / References -->
        <div class="rc-section-block" style="margin-top:16px;font-size:11px;">
          <div style="font-weight:600;margin-bottom:5px;color:var(--rc-text-muted);">ℹ️ Need more information?</div>
          <div style="margin-bottom:7px;color:var(--rc-text-muted);line-height:1.5;">
            If schedule information appears incorrect, unavailable, or does not match your environment,
            please verify the latest information using the official IBM resources below.
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <a href="https://www.ibm.com/support/pages/apptio-planning-upgrade-and-maintenance-schedule-overview?view=full"
               target="_blank" rel="noopener noreferrer"
               style="color:var(--rc-accent, #3b82d4);text-decoration:none;font-size:11px;"
               title="Opens in a new tab — IBM Support page for Apptio Planning Upgrade and Maintenance Schedule">
              ↗ Apptio Planning: Upgrade and Maintenance Schedule Overview
            </a>
            <a href="https://community.ibm.com/community/user/viewdocument/apptio-planning-whats-new-cumula?CommunityKey=4100dfb8-fc23-4203-83c7-019253cf7c0b&amp;tab=librarydocuments"
               target="_blank" rel="noopener noreferrer"
               style="color:var(--rc-accent, #3b82d4);text-decoration:none;font-size:11px;"
               title="Opens in a new tab — IBM Community page listing Apptio Planning release schedule">
              ↗ IBM Apptio Planning Release Schedule
            </a>
          </div>
        </div>

      </div><!-- /tab-calc -->

      <!-- ── Tab: Schedule ─────────────────────────────────────────────── -->
      <div id="auc-tab-panel-schedule" style="display:none;">

        <!-- Search + toggle row -->
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap;">
          <input type="text" id="auc-search-schedule" class="rc-input" style="flex:1;min-width:140px;"
                 placeholder="Filter releases…"
                 title="Filter the schedule table by version number, sandbox date, or production date" />
          <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--rc-text-muted);cursor:pointer;white-space:nowrap;"
                 title="Show all historical releases. When off, only the 10 most recent releases are shown.">
            <input type="checkbox" id="auc-show-historical"
                   title="Toggle historical releases — when checked all releases are shown; when unchecked only the 10 most recent are shown" />
            Show Historical Releases
          </label>
        </div>

        <div id="auc-schedule-count" style="font-size:11px;color:var(--rc-text-muted);margin-bottom:6px;"></div>

        <div style="overflow-x:auto;">
          <table style="width:100%;font-size:11px;border-collapse:collapse;">
            <thead>
              <tr style="border-bottom:1px solid var(--rc-border);">
                <th style="text-align:left;padding:4px 6px;font-weight:600;" title="Apptio Planning release version">Version</th>
                <th style="text-align:left;padding:4px 6px;font-weight:600;" title="Date the sandbox environment is upgraded to this release">Sandbox</th>
                <th style="text-align:left;padding:4px 6px;font-weight:600;" title="Date the production environment is upgraded to this release">Production</th>
                <th style="text-align:left;padding:4px 6px;font-weight:600;" title="Release status relative to today">Status</th>
                <th style="text-align:left;padding:4px 6px;font-weight:600;" title="Days until production date (negative = already released)">Days</th>
              </tr>
            </thead>
            <tbody id="auc-schedule-tbody"></tbody>
          </table>
        </div>

        <!-- Help / References -->
        <div class="rc-section-block" style="margin-top:12px;font-size:11px;">
          <div style="font-weight:600;margin-bottom:5px;color:var(--rc-text-muted);">ℹ️ Need more information?</div>
          <div style="margin-bottom:7px;color:var(--rc-text-muted);line-height:1.5;">
            If schedule information appears inaccurate or unavailable, please verify the latest maintenance
            and release information using the official IBM resources below.
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <a href="https://www.ibm.com/support/pages/apptio-planning-upgrade-and-maintenance-schedule-overview?view=full"
               target="_blank" rel="noopener noreferrer"
               style="color:var(--rc-accent, #3b82d4);text-decoration:none;font-size:11px;"
               title="Opens in a new tab — IBM Support page for Apptio Planning Upgrade and Maintenance Schedule">
              ↗ Apptio Planning: Upgrade and Maintenance Schedule Overview
            </a>
            <a href="https://community.ibm.com/community/user/viewdocument/apptio-planning-whats-new-cumula?CommunityKey=4100dfb8-fc23-4203-83c7-019253cf7c0b&amp;tab=librarydocuments"
               target="_blank" rel="noopener noreferrer"
               style="color:var(--rc-accent, #3b82d4);text-decoration:none;font-size:11px;"
               title="Opens in a new tab — IBM Community page listing Apptio Planning release schedule">
              ↗ IBM Apptio Planning Release Schedule
            </a>
          </div>
        </div>

      </div><!-- /tab-schedule -->

    </div><!-- /rc-panel-body -->`;
}

// ─── Event Binding + Logic ────────────────────────────────────────────────────

function bindEvents(container: HTMLElement, ctx: PluginContext): void {
  const logger        = ctx.services.logger;
  const storage       = ctx.services.storage;
  const notifications = ctx.services.notifications;

  let schedule: Schedule | null = null;
  let prefs: Prefs = { majorVersion: '', minorVersion: '', upgradeDay: 'unknown', tab: 'next' };

  // ── Element refs ──────────────────────────────────────────────────────────
  const statusBar          = container.querySelector<HTMLElement>('#auc-status-bar')!;
  const loadingEl          = container.querySelector<HTMLElement>('#auc-loading')!;
  const tabBtnNext         = container.querySelector<HTMLButtonElement>('#auc-tab-next')!;
  const tabBtnCalc         = container.querySelector<HTMLButtonElement>('#auc-tab-calc')!;
  const tabBtnSched        = container.querySelector<HTMLButtonElement>('#auc-tab-schedule')!;
  const tabPanelNext       = container.querySelector<HTMLElement>('#auc-tab-panel-next')!;
  const tabPanelCalc       = container.querySelector<HTMLElement>('#auc-tab-panel-calc')!;
  const tabPanelSched      = container.querySelector<HTMLElement>('#auc-tab-panel-schedule')!;
  const refreshBtn         = container.querySelector<HTMLButtonElement>('#auc-refresh-btn')!;
  const selectMajor        = container.querySelector<HTMLSelectElement>('#auc-select-major')!;
  const selectMinor        = container.querySelector<HTMLSelectElement>('#auc-select-minor')!;
  const selectDay          = container.querySelector<HTMLSelectElement>('#auc-select-day')!;
  const resultsKnown       = container.querySelector<HTMLElement>('#auc-results-known')!;
  const resultsUnknown     = container.querySelector<HTMLElement>('#auc-results-unknown')!;
  const calcPrompt         = container.querySelector<HTMLElement>('#auc-calc-prompt')!;
  const nextContent        = container.querySelector<HTMLElement>('#auc-next-content')!;
  const searchSchedule     = container.querySelector<HTMLInputElement>('#auc-search-schedule')!;
  const showHistoricalChk  = container.querySelector<HTMLInputElement>('#auc-show-historical')!;
  const scheduleCountEl    = container.querySelector<HTMLElement>('#auc-schedule-count')!;
  const scheduleTbody      = container.querySelector<HTMLElement>('#auc-schedule-tbody')!;
  const upgradeWindowTbody = container.querySelector<HTMLElement>('#auc-table-upgrade-window tbody')!;

  // ── Tab navigation ────────────────────────────────────────────────────────

  function activateTab(tab: string): void {
    const active = 'rc-btn rc-btn--primary rc-btn--sm';
    const idle   = 'rc-btn rc-btn--ghost rc-btn--sm';
    tabBtnNext.className  = tab === 'next'     ? active : idle;
    tabBtnCalc.className  = tab === 'calc'     ? active : idle;
    tabBtnSched.className = tab === 'schedule' ? active : idle;
    tabPanelNext.style.display  = tab === 'next'     ? 'block' : 'none';
    tabPanelCalc.style.display  = tab === 'calc'     ? 'block' : 'none';
    tabPanelSched.style.display = tab === 'schedule' ? 'block' : 'none';
    prefs.tab = tab;
    savePrefs();
  }

  tabBtnNext.addEventListener('click',  () => activateTab('next'));
  tabBtnCalc.addEventListener('click',  () => activateTab('calc'));
  tabBtnSched.addEventListener('click', () => activateTab('schedule'));

  // ── Status bar helper ─────────────────────────────────────────────────────

  function setStatusBar(msg: string, type: 'neutral' | 'success' | 'warning' | 'error'): void {
    statusBar.textContent   = msg;
    statusBar.className     = `rc-status rc-status--${type}`;
    statusBar.style.display = msg ? 'block' : 'none';
  }

  // ── Preferences ───────────────────────────────────────────────────────────

  function savePrefs(): void {
    storage.set(PREFS_KEY, prefs).catch((err: unknown) =>
      logger.warn('Failed to save preferences: ' + String(err))
    );
  }

  async function loadPrefs(): Promise<void> {
    try {
      const saved = await storage.get<Prefs>(PREFS_KEY);
      if (saved) prefs = { ...prefs, ...saved };
    } catch (err) {
      logger.warn('Failed to load preferences: ' + String(err));
    }
  }

  /**
   * Restore saved selections after dropdowns are populated.
   * Falls back to the latest release if saved selection is no longer valid.
   */
  function applyPrefs(): void {
    // Try to restore saved major
    const majorOpts = Array.from(selectMajor.options).map(o => o.value);
    if (prefs.majorVersion && majorOpts.includes(prefs.majorVersion)) {
      selectMajor.value = prefs.majorVersion;
    }
    // Rebuild minor for restored major
    if (schedule) populateMinorDropdown(schedule.releases);

    // Try to restore saved minor
    const minorOpts = Array.from(selectMinor.options).map(o => o.value);
    if (prefs.minorVersion && minorOpts.includes(prefs.minorVersion)) {
      selectMinor.value = prefs.minorVersion;
    }

    if (prefs.upgradeDay !== undefined) {
      selectDay.value = prefs.upgradeDay;
    }
  }

  // ── Version: helpers ──────────────────────────────────────────────────────

  /**
   * Extract the major part string from a version string.
   * "5.30" → "5",  "10.2" → "10",  "3.93" → "3"
   */
  function majorOf(version: string): string {
    return version.split('.')[0] ?? '';
  }

  /**
   * Extract the minor part string from a version string.
   * "5.30" → "30",  "6.0" → "0",  "3.93" → "93"
   */
  function minorOf(version: string): string {
    return version.split('.')[1] ?? '';
  }

  /**
   * Return the currently resolved full version string ("major.minor"),
   * or '' if either dropdown is empty / unselected.
   */
  function resolvedVersion(): string {
    const maj = selectMajor.value;
    const min = selectMinor.value;
    if (!maj || !min) return '';
    return `${maj}.${min}`;
  }

  // ── Version: Major dropdown ───────────────────────────────────────────────

  /**
   * Populate the Major Release dropdown from a release list.
   * Values are derived entirely from the data — nothing is hardcoded.
   * Sorted numerically ascending (3, 5, 6, 7, 10, 11 …).
   */
  function populateMajorDropdown(releases: ReleaseEntry[]): void {
    const currentMajor = selectMajor.value;

    // Collect unique major version strings, sort numerically
    const majors = Array.from(new Set(releases.map(r => majorOf(r.version))))
      .filter(m => m !== '')
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    selectMajor.innerHTML = '<option value="">— major —</option>';
    for (const m of majors) {
      const opt = document.createElement('option');
      opt.value       = m;
      opt.textContent = m;
      selectMajor.appendChild(opt);
    }

    // Restore previous major if still in the list
    if (currentMajor && majors.includes(currentMajor)) {
      selectMajor.value = currentMajor;
    }
  }

  // ── Version: Minor dropdown ───────────────────────────────────────────────

  /**
   * Populate the Minor Release dropdown for the currently selected major.
   * Only releases matching the selected major are shown.
   * Sorted numerically ascending (0, 1, 10, 12, 28, 30 …).
   */
  function populateMinorDropdown(releases: ReleaseEntry[]): void {
    const currentMinor = selectMinor.value;
    const selectedMajor = selectMajor.value;

    selectMinor.innerHTML = '<option value="">— minor —</option>';
    selectMinor.disabled = !selectedMajor;

    if (!selectedMajor) return;

    const minors = releases
      .filter(r => majorOf(r.version) === selectedMajor)
      .map(r => minorOf(r.version))
      .filter(m => m !== '');

    // Deduplicate, sort numerically
    const unique = Array.from(new Set(minors))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    for (const m of unique) {
      const opt = document.createElement('option');
      opt.value       = m;
      opt.textContent = m;
      selectMinor.appendChild(opt);
    }

    // Restore previous minor if still valid for this major
    if (currentMinor && unique.includes(currentMinor)) {
      selectMinor.value = currentMinor;
    }
  }

  /**
   * Auto-select the most recent release (latest production date).
   * Called after initial load when no saved prefs exist.
   */
  function selectLatestRelease(releases: ReleaseEntry[]): void {
    if (releases.length === 0) return;

    // Find release with the latest production date
    const latest = [...releases].sort(
      (a, b) => new Date(b.productionDate).getTime() - new Date(a.productionDate).getTime()
    )[0];

    const maj = majorOf(latest.version);
    const min = minorOf(latest.version);

    selectMajor.value = maj;
    populateMinorDropdown(releases);
    selectMinor.value = min;

    prefs.majorVersion = maj;
    prefs.minorVersion = min;
  }

  // ── Render: Next Release panel ────────────────────────────────────────────

  function renderNextRelease(releases: ReleaseEntry[]): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sorted = [...releases].sort(
      (a, b) => new Date(a.productionDate).getTime() - new Date(b.productionDate).getTime()
    );

    const latest   = [...sorted].filter(r => new Date(r.productionDate) <= today).pop();
    const upcoming = sorted.find(r => new Date(r.productionDate) > today);

    const items: string[] = [];

    if (latest) {
      items.push(makeStatCard('Latest Release', `v${latest.version}`, false,
        `Latest released version — production date was ${formatDate(parseDate(latest.productionDate))}`));
    }

    if (upcoming) {
      const prod    = parseDate(upcoming.productionDate);
      const sandbox = upcoming.sandboxDate
        ? parseDate(upcoming.sandboxDate)
        : subtractDays(prod, 7);
      const dLeft = daysBetween(today, prod);

      items.push(makeStatCard('Next Release',    `v${upcoming.version}`, true,
        'The next upcoming Apptio Planning release version'));
      items.push(makeStatCard('Sandbox Date',    formatDate(sandbox),    false,
        `Date the sandbox environment will be upgraded to v${upcoming.version}`));
      items.push(makeStatCard('Production Date', formatDate(prod),       false,
        `Date the production environment will be upgraded to v${upcoming.version}`));
      items.push(makeStatCard('Days Remaining',
        dLeft >= 0 ? `${dLeft}d` : 'Released', false,
        'Calendar days until the production release date'));
    } else {
      items.push(makeStatCard('Next Release', 'No upcoming releases on schedule', false,
        'No future releases are currently listed on the IBM Community schedule'));
    }

    nextContent.innerHTML = items.join('');
  }

  function makeStatCard(label: string, value: string, accent: boolean, tooltip: string): string {
    return `<div class="auc-stat" title="${esc(tooltip)}" style="min-width:120px;flex:1;">
      <span class="auc-stat-label">${esc(label)}</span>
      <span class="auc-stat-value${accent ? ' rc-text-accent' : ''}">${esc(value)}</span>
    </div>`;
  }

  // ── Render: Calculator ────────────────────────────────────────────────────

  function calculate(): void {
    const version = resolvedVersion();
    const dayVal  = selectDay.value;

    resultsKnown.style.display   = 'none';
    resultsUnknown.style.display = 'none';
    calcPrompt.style.display     = 'none';

    if (!version || !schedule) {
      calcPrompt.style.display = 'block';
      return;
    }

    const release = schedule.releases.find(r => r.version === version);
    if (!release) {
      calcPrompt.style.display = 'block';
      logger.warn(`Release v${version} not found in schedule`);
      return;
    }

    logger.info(`Calculating upgrade dates: version=${version} upgradeDay=${dayVal}`);

    const prodDate    = parseDate(release.productionDate);
    const sandboxDate = release.sandboxDate
      ? parseDate(release.sandboxDate)
      : subtractDays(prodDate, 7);

    if (dayVal === 'unknown') {
      renderUnknownResults(sandboxDate, prodDate, release);
      resultsUnknown.style.display = 'block';
    } else {
      const upgradeDay    = parseInt(dayVal, 10);
      const upgradeDate   = firstWeekdayOnOrAfter(prodDate, upgradeDay);
      const daysRemaining = daysBetween(new Date(), upgradeDate);
      renderKnownResults(sandboxDate, prodDate, upgradeDate, daysRemaining, dayVal);
      resultsKnown.style.display = 'block';
    }
  }

  function setEl(id: string, val: string): void {
    const el = container.querySelector<HTMLElement>(`#${id}`);
    if (el) el.textContent = val;
  }

  function renderKnownResults(
    sandboxDate: Date, prodDate: Date,
    upgradeDate: Date, daysRemaining: number, _dayVal: string
  ): void {
    setEl('auc-res-sandbox-date',  formatDate(sandboxDate));
    setEl('auc-res-prod-date',     formatDate(prodDate));
    setEl('auc-res-upgrade-date',  formatDate(upgradeDate));
    const dLabel = daysRemaining < 0
      ? `${Math.abs(daysRemaining)} days ago`
      : daysRemaining === 0
        ? 'Today'
        : `${daysRemaining} days`;
    setEl('auc-res-days-remaining', dLabel);
  }

  function renderUnknownResults(sandboxDate: Date, prodDate: Date, _release: ReleaseEntry): void {
    setEl('auc-res-sandbox-date-u', formatDate(sandboxDate));
    setEl('auc-res-prod-date-u',    formatDate(prodDate));
    renderWindowTable(upgradeWindowTbody, prodDate);
  }

  function renderWindowTable(tbody: HTMLElement, startDate: Date): void {
    tbody.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const d  = addDays(startDate, i);
      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom:1px solid var(--rc-border);';
      tr.innerHTML =
        `<td style="padding:3px 6px;">${DAY_NAMES[d.getDay()]}</td>` +
        `<td style="padding:3px 6px;">${formatDate(d)}</td>`;
      tbody.appendChild(tr);
    }
  }

  // ── Render: Schedule table ────────────────────────────────────────────────

  /**
   * Render the schedule table.
   *
   * Default view: latest 10 releases sorted by Production Date DESC.
   * Historical view: all releases, same sort order.
   * A text query further filters whichever set is active.
   */
  function renderScheduleTable(releases: ReleaseEntry[], query = ''): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort all releases by Production Date DESC (most recent first)
    const sortedDesc = [...releases].sort(
      (a, b) => parseDate(b.productionDate).getTime() - parseDate(a.productionDate).getTime()
    );

    // Determine display set before applying text query
    const showAll    = showHistoricalChk.checked;
    const displaySet = showAll ? sortedDesc : sortedDesc.slice(0, SCHEDULE_DEFAULT_COUNT);

    // Apply optional text filter
    const filtered = query
      ? displaySet.filter(r =>
          r.version.includes(query) ||
          r.productionDate.includes(query) ||
          (r.sandboxDate && r.sandboxDate.includes(query))
        )
      : displaySet;

    // Update count label
    const totalCount = releases.length;
    if (showAll) {
      scheduleCountEl.textContent = `Showing all ${totalCount} release${totalCount !== 1 ? 's' : ''}.`;
    } else {
      const shown = Math.min(SCHEDULE_DEFAULT_COUNT, totalCount);
      scheduleCountEl.textContent =
        `Showing ${shown} most recent release${shown !== 1 ? 's' : ''} of ${totalCount} total.` +
        (totalCount > SCHEDULE_DEFAULT_COUNT ? ' Enable "Show Historical Releases" to see all.' : '');
    }

    if (filtered.length === 0) {
      scheduleTbody.innerHTML =
        `<tr><td colspan="5" style="padding:8px;text-align:center;color:var(--rc-text-muted);">No releases found.</td></tr>`;
      return;
    }

    // For badge logic we still need the "next" release from the full sorted list
    const nextRelease = [...releases]
      .sort((a, b) => parseDate(a.productionDate).getTime() - parseDate(b.productionDate).getTime())
      .find(r => parseDate(r.productionDate) > today);

    scheduleTbody.innerHTML = '';

    for (const r of filtered) {
      const prod      = parseDate(r.productionDate);
      const sandbox   = r.sandboxDate ? parseDate(r.sandboxDate) : subtractDays(prod, 7);
      const released  = prod <= today;
      const isNext    = nextRelease && r.version === nextRelease.version;
      const daysUntil = daysBetween(today, prod);

      const badge = released
        ? '<span class="rc-badge" style="background:#2ea043;color:#fff;">Released</span>'
        : isNext
          ? '<span class="rc-badge rc-badge--blue">Next</span>'
          : '<span class="rc-badge" style="background:var(--rc-surface);color:var(--rc-text-muted);">Upcoming</span>';

      const daysCell = released
        ? `<span style="color:var(--rc-text-muted);">${Math.abs(daysUntil)}d ago</span>`
        : `${daysUntil}d`;

      const tr = document.createElement('tr');
      tr.style.cssText = 'border-bottom:1px solid var(--rc-border);';
      tr.innerHTML =
        `<td style="padding:4px 6px;font-weight:600;" title="Release version">v${esc(r.version)}</td>` +
        `<td style="padding:4px 6px;" title="Sandbox upgrade date">${esc(formatDate(sandbox))}</td>` +
        `<td style="padding:4px 6px;" title="Production upgrade date">${esc(formatDate(prod))}</td>` +
        `<td style="padding:4px 6px;">${badge}</td>` +
        `<td style="padding:4px 6px;">${daysCell}</td>`;
      scheduleTbody.appendChild(tr);
    }
  }

  // ── Copy helpers ──────────────────────────────────────────────────────────

  async function copyText(type: 'summary' | 'response', isUnknown: boolean): Promise<void> {
    const version = resolvedVersion();
    if (!version || !schedule) return;

    const release = schedule.releases.find(r => r.version === version);
    if (!release) return;

    const prodDate    = parseDate(release.productionDate);
    const sandboxDate = release.sandboxDate
      ? parseDate(release.sandboxDate)
      : subtractDays(prodDate, 7);

    let text = '';
    if (!isUnknown) {
      const upgradeDay  = parseInt(selectDay.value, 10);
      const upgradeDate = firstWeekdayOnOrAfter(prodDate, upgradeDay);
      const dayName     = DAY_NAMES[upgradeDate.getDay()];
      text = type === 'summary'
        ? buildSummaryKnown(version, sandboxDate, prodDate, upgradeDate, dayName)
        : buildResponseKnown(version, prodDate, upgradeDate);
    } else {
      const endDate = addDays(prodDate, 6);
      text = type === 'summary'
        ? buildSummaryUnknown(version, sandboxDate, prodDate, endDate)
        : buildResponseUnknown(version, prodDate, endDate);
    }

    try {
      await navigator.clipboard.writeText(text);
      const btnId = isUnknown ? `auc-copy-${type}-u` : `auc-copy-${type}-k`;
      flashBtn(container.querySelector<HTMLButtonElement>(`#${btnId}`));
      const label = type === 'summary' ? 'Summary' : 'Customer Response';
      logger.info(`Copied ${label} for v${version} (${isUnknown ? 'unknown day' : selectDay.value})`);
      notifications.show({
        id:       `auc-copy-${Date.now()}`,
        title:    'Apptio Planning Upgrade Calculator',
        message:  `${label} copied to clipboard.`,
        type:     'success',
        duration: 2000,
        pluginId: PLUGIN_ID,
      });
    } catch (err) {
      logger.error('Clipboard write failed: ' + String(err));
    }
  }

  function flashBtn(btn: HTMLButtonElement | null): void {
    if (!btn) return;
    const orig = btn.textContent ?? '';
    btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = orig; }, 1500);
  }

  // ── Copy text builders ────────────────────────────────────────────────────

  function buildSummaryKnown(
    version: string, sandboxDate: Date, prodDate: Date,
    upgradeDate: Date, dayName: string
  ): string {
    return [
      `Release: ${version}`,
      `Sandbox Date: ${formatDate(sandboxDate)}`,
      `Production Date: ${formatDate(prodDate)}`,
      `Upgrade Day: ${dayName}`,
      `Expected Upgrade Date: ${formatDate(upgradeDate)}`,
    ].join('\n');
  }

  function buildResponseKnown(version: string, prodDate: Date, upgradeDate: Date): string {
    return [
      `Release ${version} is scheduled for Production deployment on ${formatDate(prodDate)}.`,
      '',
      `Customer upgrades are typically performed during the first week following the Production Release Date.`,
      '',
      `Based on the current schedule, your environment is expected to be upgraded on ${formatDate(upgradeDate)}.`,
    ].join('\n');
  }

  function buildSummaryUnknown(
    version: string, sandboxDate: Date, prodDate: Date, endDate: Date
  ): string {
    return [
      `Release: ${version}`,
      `Sandbox Date: ${formatDate(sandboxDate)}`,
      `Production Date: ${formatDate(prodDate)}`,
      `Upgrade Day: Unknown`,
      `Possible Upgrade Window: ${formatDate(prodDate)} – ${formatDate(endDate)}`,
    ].join('\n');
  }

  function buildResponseUnknown(version: string, prodDate: Date, endDate: Date): string {
    return [
      `Release ${version} is scheduled for Production deployment on ${formatDate(prodDate)}.`,
      '',
      `Customer upgrades are typically performed during the first week following the Production Release Date.`,
      '',
      `Based on the current schedule, your environment is expected to be upgraded between ${formatDate(prodDate)} and ${formatDate(endDate)}.`,
      '',
      `The exact date depends on the Upgrade Day configured in Company Profile.`,
    ].join('\n');
  }

  // ── Load & render ─────────────────────────────────────────────────────────

  async function loadAndRender(forceRefresh = false): Promise<void> {
    loadingEl.style.display = 'block';
    setStatusBar('⏳ Loading schedule…', 'neutral');
    refreshBtn.disabled = true;

    try {
      if (forceRefresh) {
        schedule = await refreshSchedule(storage, logger);
      } else {
        schedule = await getSchedule(storage, logger, CACHE_MS);
      }

      loadingEl.style.display = 'none';
      const { source, lastUpdated, releases } = schedule;

      const sourceLabels: Record<string, string> = {
        live:  '✔ Live IBM Community Schedule',
        cache: '✔ Cached Schedule',
        local: '⚠ Local Fallback Schedule',
      };
      const type: 'success' | 'warning' = source === 'local' ? 'warning' : 'success';
      const label = sourceLabels[source] ?? source;
      const dateStr = lastUpdated && lastUpdated !== 'unknown'
        ? ` — ${new Date(lastUpdated).toLocaleString()}`
        : '';
      setStatusBar(`${label}${dateStr}`, type);

      // Populate major dropdown from data
      populateMajorDropdown(releases);

      // Restore saved prefs; if none saved, fall back to latest release
      const hasSavedPrefs = !!(prefs.majorVersion || prefs.minorVersion);
      if (hasSavedPrefs) {
        applyPrefs();
      } else {
        selectLatestRelease(releases);
      }

      // Render dependent minor dropdown for whatever major is now selected
      populateMinorDropdown(releases);

      renderNextRelease(releases);
      renderScheduleTable(releases);
      calculate();

      const notifType = source === 'live' ? 'success' : source === 'cache' ? 'info' : 'warning';
      const notifMsg  = source === 'live'
        ? `Loaded ${releases.length} releases from IBM Community`
        : source === 'cache'
          ? `Using cached schedule (${releases.length} releases)`
          : `Using local fallback schedule (${releases.length} releases)`;

      logger.info(`Schedule loaded (${source}): ${releases.length} releases`);
      notifications.show({
        id:       `auc-schedule-${source}-${Date.now()}`,
        title:    'Apptio Planning Upgrade Calculator',
        message:  notifMsg,
        type:     notifType,
        duration: 3000,
        pluginId: PLUGIN_ID,
      });

    } catch (err) {
      loadingEl.style.display = 'none';
      setStatusBar('❌ Failed to load schedule: ' + String(err), 'error');
      logger.error('Failed to load schedule: ' + String(err));
      notifications.show({
        id:       `auc-error-${Date.now()}`,
        title:    'Apptio Planning Upgrade Calculator — Error',
        message:  'Failed to load schedule: ' + String(err),
        type:     'error',
        duration: 0,
        pluginId: PLUGIN_ID,
      });
    } finally {
      refreshBtn.disabled = false;
    }
  }

  // ── Event wiring ──────────────────────────────────────────────────────────

  refreshBtn.addEventListener('click', () => {
    logger.info('Manual schedule refresh triggered');
    loadAndRender(true);
  });

  selectMajor.addEventListener('change', () => {
    prefs.majorVersion = selectMajor.value;
    prefs.minorVersion = '';   // reset minor when major changes
    savePrefs();
    if (schedule) populateMinorDropdown(schedule.releases);
    calculate();
  });

  selectMinor.addEventListener('change', () => {
    prefs.minorVersion = selectMinor.value;
    savePrefs();
    calculate();
  });

  selectDay.addEventListener('change', () => {
    prefs.upgradeDay = selectDay.value;
    savePrefs();
    calculate();
  });

  let searchTimer: ReturnType<typeof setTimeout> | null = null;
  searchSchedule.addEventListener('input', () => {
    clearTimeout(searchTimer!);
    searchTimer = setTimeout(() => {
      if (schedule) renderScheduleTable(schedule.releases, searchSchedule.value.toLowerCase());
    }, 200);
  });

  showHistoricalChk.addEventListener('change', () => {
    if (schedule) renderScheduleTable(schedule.releases, searchSchedule.value.toLowerCase());
  });

  container.querySelector('#auc-copy-summary-k')?.addEventListener('click',  () => copyText('summary',  false));
  container.querySelector('#auc-copy-response-k')?.addEventListener('click', () => copyText('response', false));
  container.querySelector('#auc-copy-summary-u')?.addEventListener('click',  () => copyText('summary',  true));
  container.querySelector('#auc-copy-response-u')?.addEventListener('click', () => copyText('response', true));

  // ── Boot ──────────────────────────────────────────────────────────────────

  logger.info(`${PLUGIN_ID}: UI rendered — loading schedule`);

  loadPrefs().then(() => {
    activateTab(prefs.tab || 'next');
    loadAndRender(false);
  });
}
