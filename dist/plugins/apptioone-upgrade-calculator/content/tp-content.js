/**
 * tp-content.js — ApptioOne Upgrade Calculator
 * Content script for apptioupgrades.tpondemand.com
 *
 * Extracts upgrade request data from the TargetProcess board DOM.
 * Message protocol:
 *   extract       -> { success, data: { fields, timeline, rowCount } }
 *   search        -> { success, results: [...] }
 *   extractById   -> { success, data: { fields, timeline } }
 *   diagnose      -> { success, data }
 *   waitForRows   -> { success, rowCount }
 */

'use strict';

const HEADER_TO_KEY = {
  'id':                                  'id',
  'account':                             'account',
  'instance url (customer.apptio.com)':  'instanceUrl',
  'instance url':                        'instanceUrl',
  'customer success manager':            'csm',
  'current build':                       'currentBuild',
  'upgrade build to':                    'upgradeBuild',
  'upgrade date':                        'upgradeDate',
  'upgrade time':                        'upgradeTime',
  'upgrade type':                        'upgradeType',
  'time zone':                           'timeZone',
  'sf id':                               'sfId',
  'status in sf':                        'statusInSF',
  'status':                              'status',
};

const CLASS_FRAGS = {
  name:         'entity_name_1line',
  account:      'account_short',
  instanceUrl:  'aW5zdGFuY2UgdXJsIC',
  csm:          'Y3VzdG9tZXIgc3Vj',
  currentBuild: 'Y3VycmVudCBidWlsZA',
  upgradeBuild: 'dXBncmFkZSBidWlsZCB0bw',
  upgradeDate:  'dXBncmFkZSBkYXRl',
  upgradeTime:  'dXBncmFkZSB0aW1l',
  upgradeType:  'dXBncmFkZSB0eXBl',
  timeZone:     'dGltZSB6b25l',
  sfId:         'c2YgaWQ',
  statusInSF:   'c3RhdHVzIGluIHNm',
  status:       'c3RhdHVz',
};

let _colIndexCache = null;
let _headerCells   = null;

function buildColIndexMap() {
  if (_colIndexCache) return _colIndexCache;
  _colIndexCache = {};
  const headerRow = document.querySelector(
    '.tau-rows-header .tau-elems-table-level-0, ' +
    '.tau-elems-table-header .tau-elems-table-level-0, ' +
    '[class*="tau-rows-header"] [class*="tau-elems-table-level-0"]'
  );
  if (!headerRow) return _colIndexCache;
  const cells = Array.from(headerRow.children);
  _headerCells = cells;
  cells.forEach((cell, idx) => {
    const label = (cell.innerText || cell.textContent || '').trim().toLowerCase();
    if (!label) return;
    if (HEADER_TO_KEY[label] !== undefined) { _colIndexCache[HEADER_TO_KEY[label]] = idx; return; }
    for (const [header, key] of Object.entries(HEADER_TO_KEY)) {
      if (label.includes(header) || header.includes(label)) { _colIndexCache[key] = _colIndexCache[key] ?? idx; }
    }
  });
  return _colIndexCache;
}

function getAllRows() {
  let rows = Array.from(document.querySelectorAll('.tau-list-upgraderequest'));
  if (rows.length === 0) rows = Array.from(document.querySelectorAll('[class*="tau-list-upgraderequest"]'));
  return rows;
}

function getRowTable(row) {
  return row.querySelector('.tau-elems-table-level-0, [class*="tau-elems-table-level-0"]')
      || row.querySelector('[class*="tau-elems-table"]') || row;
}

function cellInnerText(cell) {
  if (!cell) return '';
  const t = (cell.innerText || '').trim().replace(/\s+/g, ' ');
  return t || (cell.textContent || '').trim().replace(/\s+/g, ' ');
}

function readField(row, fieldKey) {
  const rowTable = getRowTable(row);
  const cells = rowTable ? Array.from(rowTable.children) : [];
  const colMap = buildColIndexMap();
  if (colMap[fieldKey] !== undefined && cells[colMap[fieldKey]]) {
    const t = cellInnerText(cells[colMap[fieldKey]]);
    if (t && t !== '—' && t !== '-' && t !== 'click to edit') return t;
  }
  const frag = CLASS_FRAGS[fieldKey];
  if (frag) {
    const el = row.querySelector(`[class*="${frag}"]`);
    if (el) {
      const t = cellInnerText(el);
      if (t && t !== '—' && t !== '-' && t !== 'click to edit') return t;
    }
  }
  return '';
}

function parseRow(row) {
  const rec = {};
  rec.id = row.getAttribute('i-id') || row.getAttribute('data-entity-id') || row.getAttribute('data-id') || '';
  if (!rec.id) {
    const idCell = row.querySelector('[class*="tau-list-id-cell"], [class*="extendable_domain__id"]');
    if (idCell) { const t = cellInnerText(idCell); if (/^\d+$/.test(t)) rec.id = t; }
  }
  if (!rec.id) {
    const link = row.querySelector('a[href*="/entity/"]');
    if (link) { const m = (link.href || '').match(/\/entity\/(\d+)/i); if (m) rec.id = m[1]; }
  }
  if (!rec.id) { const t = readField(row, 'id'); if (/^\d+$/.test(t)) rec.id = t; }
  for (const key of Object.keys(CLASS_FRAGS)) { const val = readField(row, key); if (val) rec[key] = val; }
  if (!rec.account) {
    const nameVal = readField(row, 'name');
    if (nameVal) { const m = nameVal.match(/^([^,]+),/); if (m) rec.account = m[1].trim(); }
  }
  return rec;
}

function diagnoseCells() {
  const rows = getAllRows();
  if (rows.length === 0) return { error: 'No rows found' };
  const row = rows[0];
  const rowTable = getRowTable(row);
  const cells = rowTable ? Array.from(rowTable.children) : [];
  return {
    rowCount: rows.length,
    rowAttr: { 'i-id': row.getAttribute('i-id'), class: row.className.slice(0, 120) },
    cellCount: cells.length,
    colIndexMap: buildColIndexMap(),
    cells: cells.slice(0, 20).map((c, i) => ({ index: i, class: c.className.slice(0, 150), text: cellInnerText(c).slice(0, 60) })),
  };
}

function rowRawText(row) {
  const rowTable = getRowTable(row);
  const cells = rowTable ? Array.from(rowTable.children) : [];
  const parts = cells.map(c => cellInnerText(c)).filter(Boolean);
  parts.push((row.innerText || '').replace(/\s+/g, ' '));
  return parts.join(' ').toLowerCase();
}

function searchRows(query) {
  if (!query || query.trim().length < 2) return [];
  const q = query.trim().toLowerCase();
  const qNorm = q.replace(/[.:_-]/g, ' ').replace(/\s+/g, ' ').trim();
  const rows = getAllRows();
  const results = [];
  for (const row of rows) {
    const raw = rowRawText(row);
    const rawNorm = raw.replace(/[.:_-]/g, ' ').replace(/\s+/g, ' ');
    if (!raw.includes(q) && !rawNorm.includes(qNorm)) continue;
    const rec = parseRow(row);
    if (!rec.instanceUrl) {
      const hostMatch = raw.match(/\b([a-z0-9][\w.-]*\.apptio\.com)\b/i) || raw.match(/\b([a-z0-9][\w.-]*\.[a-z]{2,})\b/i);
      if (hostMatch) rec.instanceUrl = hostMatch[1];
    }
    results.push({ id: rec.id, account: rec.account || '', instanceUrl: rec.instanceUrl || '', upgradeDate: rec.upgradeDate || '', status: rec.status || '' });
    if (results.length >= 20) break;
  }
  return results;
}

function parseDate(str) {
  if (!str || str === 'Not Found') return null;
  const cleaned = str.replace(/\s+\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?/i, '').trim();
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d;
  const m = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/);
  if (m) { const attempt = new Date(`${m[2]} ${m[1]}, ${m[3]}`); if (!isNaN(attempt.getTime())) return attempt; }
  return null;
}

function formatDate(d) {
  if (!d) return 'Not Found';
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  return Math.round(Math.abs(b - a) / 86400000);
}

function buildTimelineFromDates(ignoredCurrentDateStr, dateSources) {
  const timeline = { previousUpgrade: 'Not Found', currentUpgrade: 'Not Found', nextUpgrade: 'Not Found', daysSincePrev: 'Not Found', daysUntilNext: 'Not Found', upgradeFrequency: 'Not Found' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const timestamps = new Set();
  (dateSources || []).forEach(str => { const d = parseDate(str); if (d) timestamps.add(d.getTime()); });
  if (timestamps.size === 0) return timeline;
  const past = []; const future = [];
  timestamps.forEach(ts => { if (ts <= today.getTime()) past.push(ts); else future.push(ts); });
  past.sort((a, b) => b - a); future.sort((a, b) => a - b);
  if (past.length > 0) {
    const curr = new Date(past[0]);
    timeline.currentUpgrade = formatDate(curr);
    if (past.length > 1) { const prev = new Date(past[1]); timeline.previousUpgrade = formatDate(prev); timeline.daysSincePrev = String(daysBetween(prev, curr)); }
  }
  if (future.length > 0) { const next = new Date(future[0]); timeline.nextUpgrade = formatDate(next); timeline.daysUntilNext = String(daysBetween(today, next)); }
  const allSorted = [...past, ...future].sort((a, b) => a - b);
  if (allSorted.length >= 2) {
    const gaps = []; for (let i = 1; i < allSorted.length; i++) gaps.push(Math.round((allSorted[i] - allSorted[i-1]) / 86400000));
    const avg = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
    if (avg > 0) {
      timeline.upgradeFrequency = `${avg} Days`;
      if (timeline.nextUpgrade === 'Not Found' && timeline.currentUpgrade !== 'Not Found') {
        const curr = parseDate(timeline.currentUpgrade);
        if (curr) { const est = new Date(curr.getTime() + avg * 86400000); timeline.nextUpgrade = `~${formatDate(est)} (est.)`; timeline.daysUntilNext = String(daysBetween(today, est)); }
      }
    }
  }
  return timeline;
}

function buildTimeline(ignoredCurrentDateStr, account) {
  const allRows = getAllRows();
  const dateSources = [];
  for (const row of allRows) {
    const rec = parseRow(row);
    if (account && rec.account && rec.account.toLowerCase() !== account.toLowerCase()) continue;
    if (rec.upgradeDate && rec.upgradeDate !== 'Not Found') dateSources.push(rec.upgradeDate);
  }
  return buildTimelineFromDates(null, dateSources);
}

function extractRowById(entityId) {
  const rows = getAllRows();
  for (const row of rows) {
    const rid = row.getAttribute('i-id') || row.getAttribute('data-entity-id') || row.getAttribute('data-id') || '';
    if (rid === String(entityId)) return parseRow(row);
  }
  if (rows.length > 0) return parseRow(rows[0]);
  return null;
}

function extractAll() {
  _colIndexCache = null;
  const rows = getAllRows();
  if (rows.length === 0) return { fields: {}, timeline: buildTimeline(null, null), rowCount: 0 };
  const target = rows.find(r => r.classList.contains('tau-selected') || r.classList.contains('tau-list--selected') || r.getAttribute('aria-selected') === 'true') || rows[0];
  const fields = parseRow(target);
  const timeline = buildTimeline(fields.upgradeDate, fields.account);
  return { fields, timeline, rowCount: rows.length };
}

function extractAllRows() {
  _colIndexCache = null;
  const rows = getAllRows();
  if (rows.length === 0) return { records: [], rowCount: 0 };
  const allDates = [];
  const records = rows.map(function(row) {
    const fields = parseRow(row);
    if (fields.upgradeDate && fields.upgradeDate !== 'Not Found') allDates.push(fields.upgradeDate);
    return fields;
  });
  // Enrich each record with a per-account timeline using all dates visible on the board
  records.forEach(function(rec) {
    const accountDates = records
      .filter(function(r) { return r.account && rec.account && r.account.toLowerCase() === rec.account.toLowerCase() && r.upgradeDate && r.upgradeDate !== 'Not Found'; })
      .map(function(r) { return r.upgradeDate; });
    rec._timeline = buildTimelineFromDates(null, accountDates.length > 0 ? accountDates : allDates);
  });
  return { records: records, rowCount: rows.length };
}

if (!window.__aoUcTpListenerRegistered) {
  window.__aoUcTpListenerRegistered = true;
  chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    if (request.action === 'aouc:extract') {
      try { sendResponse({ success: true, data: extractAll() }); } catch (err) { sendResponse({ success: false, error: err.message }); }
      return true;
    }
    if (request.action === 'aouc:extractAllRows') {
      try { sendResponse({ success: true, data: extractAllRows() }); } catch (err) { sendResponse({ success: false, error: err.message }); }
      return true;
    }
    if (request.action === 'aouc:search') {
      try { sendResponse({ success: true, results: searchRows(request.query) }); } catch (err) { sendResponse({ success: false, error: err.message }); }
      return true;
    }
    if (request.action === 'aouc:extractById') {
      try {
        const fields = extractRowById(request.entityId);
        const timeline = (request.contextDates && request.contextDates.length > 0)
          ? buildTimelineFromDates(fields ? fields.upgradeDate : null, request.contextDates)
          : buildTimeline(fields ? fields.upgradeDate : null, fields ? fields.account : null);
        sendResponse({ success: true, data: { fields: fields || {}, timeline } });
      } catch (err) { sendResponse({ success: false, error: err.message }); }
      return true;
    }
    if (request.action === 'aouc:diagnose') {
      try { sendResponse({ success: true, data: diagnoseCells() }); } catch (err) { sendResponse({ success: false, error: err.message }); }
      return true;
    }
    if (request.action === 'aouc:waitForRows') {
      const minRows = request.minRows || 5;
      const timeoutMs = request.timeoutMs || 25000;
      const start = Date.now();
      (function poll() {
        const rows = getAllRows();
        if (rows.length >= minRows) { sendResponse({ success: true, rowCount: rows.length }); return; }
        if (Date.now() - start > timeoutMs) { sendResponse({ success: false, rowCount: rows.length, reason: 'timeout' }); return; }
        setTimeout(poll, 600);
      }());
      return true;
    }
  });
}
