/**
 * Environment Dashboards Launcher - ReplyCators Plugin
 * plugins/env-dashboards.js
 *
 * Plugin ID : com.replycators.env-dashboards
 * Version   : 1.3.0
 *
 * Architecture
 * ------------
 * onNavigate() renders the dashboard cards synchronously - zero async work.
 * Environment resolution happens only when the user clicks a dashboard:
 *   1. chrome.tabs.query()  →  active customer tab URL
 *   2. Parse hostname       →  environment name
 *   3. Build URL            →  replace only dynamic params
 *   4. chrome.tabs.create() →  open the dashboard
 *
 * No loading state. No startup API calls. No pre-fetching.
 *
 * Supported customer URL sources (v1.2.0):
 *   *.apptio.com        e.g. csbox-emea-r12.apptio.com
 *   *.apps.papt.to      e.g. csbox-us-east-r12.apps.papt.to/biit/data/...
 *
 * Storage key
 * ───────────
 *   rc:plugin:com.replycators.env-dashboards:state  →  { lastEnv: string }
 */
(function () {
  'use strict';

  /* ── constants ──────────────────────────────────────────────────────────── */

  var PLUGIN_ID   = 'com.replycators.env-dashboards';
  var STORAGE_KEY = 'rc:plugin:' + PLUGIN_ID + ':state';

  /* Static base URLs - only the dynamic parameters are replaced on click      */
  var SPLUNK_BASE  = 'https://apptio.splunkcloud.com/en-US/app/Apptio_SA_Flagship/';
  var GRAFANA_BASE = 'https://grafana.apps.papt.to/d/';

  /* PVC dashboard base - dynamic params derived from env region at click time. */
  var PVC_BASE = 'https://grafana.apps.papt.to/d/UHO8csGIk/akp-biit-persistent-volumes-metrics';

  /**
   * BIIT internal diagnostics base.
   * URL pattern (from csbox-us-east-r12-web-1cfha _data.html):
   *   https://{env}.apps.papt.to/biit/data/
   *   https://{env}.apps.papt.to/biit/log/
   *   https://{env}.apps.papt.to/biit/data/__proxy__/{pod}-0.{env}-biit.f-{env}.svc.cluster.local:9180/
   *
   * The base /biit/data/ link lists all running web pods for the env.
   * The /biit/log/ link shows application logs for the env.
   */
  var PAPT_BASE = 'https://{env}.apps.papt.to';

  /**
   * Region map - keyed by the region token embedded in the environment name.
   *
   * Evidence sources:
   *   us-east : Deployments screenshot shows cluster=uw2p-akp-b7.
   *             EC2 Node from csbox-us-east-r12-web HTML confirms:
   *               ip-172-24-136-92.us-west-2.compute.internal
   *             Confirms: us-east envs run on uw2p (US-West-2 Pacific AKP cluster).
   *             cloudwatchRegion = us-west-2 (the AKP cluster's AWS region).
   *   emea    : Original PVC example URL used aws_datasource=hfQDcHH7z,
   *             cluster=ew1p-akp-b1, region=eu-west-1.
   *   us-west : Same AKP prod datasource; us-west-2 for CloudWatch region.
   *   apac    : Inferred from AKP naming conventions.
   *
   * Fields:
   *   akpCluster        - AKP Kubernetes cluster name
   *   awsDatasource     - Grafana aws_datasource variable value
   *   cloudwatchRegion  - Grafana region variable value (CloudWatch datasource region,
   *                       NOT the customer env's deployment region)
   *   clusterDatasource - Grafana cluster_datasource variable value
   */
  var REGION_MAP = {
    'us-east': {
      akpCluster:        'uw2p-akp-b7',
      awsDatasource:     'CloudWatch-akp-prod',
      cloudwatchRegion:  'us-west-2',   // AKP cluster is uw2p = US-West-2 Pacific
      clusterDatasource: 'akp-all-prod',
    },
    'us-west': {
      akpCluster:        'uw2p-akp-b1',
      awsDatasource:     'CloudWatch-akp-prod',
      cloudwatchRegion:  'us-west-2',
      clusterDatasource: 'akp-all-prod',
    },
    'emea': {
      akpCluster:        'ew1p-akp-b1',
      awsDatasource:     'CloudWatch-akp-prod',
      cloudwatchRegion:  'eu-west-1',
      clusterDatasource: 'akp-all-prod',
    },
    'apac': {
      akpCluster:        'aps1-akp-b1',
      awsDatasource:     'CloudWatch-akp-prod',
      cloudwatchRegion:  'ap-southeast-1',
      clusterDatasource: 'akp-all-prod',
    },
  };

  /**
   * Parse the region token out of an environment name.
   * e.g. "csbox-us-east-r12" → "us-east"
   *      "csbox-emea-r12"    → "emea"
   *      "csbox-us-west-r12" → "us-west"
   *      "petest-shadow"     → null
   */
  function regionOf(env) {
    for (var token in REGION_MAP) {
      if (REGION_MAP.hasOwnProperty(token)) {
        // Match: <anything>-<token>  optionally followed by -r<digits>
        if (new RegExp('(?:^|-)' + token + '(?:-r\\d+)?$').test(env)) {
          return token;
        }
      }
    }
    return null;
  }

  /* ── app reference ─────────────────────────────────────────────────────── */

  function app() { return window.ReplyCatorsApp; }

  /* ── URL builders (called only after a dashboard is clicked) ────────────── */

  function buildStringUsage(env) {
    // Only form.selectedPrefix is dynamic; all other params are static.
    var p = new URLSearchParams();
    p.set('form.time.earliest', '-30d@d');
    p.set('form.time.latest',   'now');
    p.set('form.selectedPrefix', env);
    return SPLUNK_BASE + 'string_usage?' + p.toString();
  }

  function buildCalcProfiler(env) {
    // Only form.selectedContainerPrefix is dynamic.
    var p = new URLSearchParams();
    p.set('form.time.earliest',           '-1mon@mon');
    p.set('form.time.latest',             'now');
    p.set('form.selectedDatacenter',      '*');
    p.set('form.selectedCustomer',        '*');
    p.set('form.selectedVersion',         '*');
    p.set('form.selectedDomain',          '*');
    p.set('form.multiSelectProject',      '*');
    p.set('form.selectedBuildType',       'Full');
    p.set('form.selectedContainerPrefix', env);
    p.set('form.includeReportUsage',      'no');
    return SPLUNK_BASE + 'cetools_r12_background_calculation_profiler?' + p.toString();
  }

  function buildDeployments(env) {
    // Dynamic: var-namespace, var-deployment, var-match_namespace.
    // var-match_cluster: not auto-resolved - kept as $__all.
    // Grafana requires $__all literally; encode $ as %24 to survive URL parsing.
    var ns = 'f-' + env;
    var parts = [
      'from=now-1h',
      'to=now',
      'var-datasource=000000063',
      'var-cluster=%24__all',
      'var-namespace='       + encodeURIComponent(ns),
      'var-deployment='      + encodeURIComponent(env),
      'var-biitnode=%24__all',
      'orgId=1',
      'var-match_cluster=%24__all',
      'var-match_namespace=' + encodeURIComponent(ns),
    ];
    return GRAFANA_BASE + 'XDLxmR6Wz/akp-biit-deployments?' + parts.join('&');
  }

  function buildPvc(env) {
    // Derive datasource, region and cluster from the environment's region token.
    // PVC-specific params (pvc name, pod, pv, volume id) open as $__all so
    // the user selects them in Grafana - they cannot be derived from the hostname.
    // Returns null when region cannot be resolved - callers must handle null.
    var ns      = 'f-' + env;
    var token   = regionOf(env);
    var info    = token ? REGION_MAP[token] : null;

    // If region is unknown we cannot safely build this URL -
    // opening with wrong cluster/datasource shows "No data" (confirmed).
    // Return null so handleOpen() can warn the user instead.
    if (!info) return null;

    var parts = [
      'var-aws_datasource='     + encodeURIComponent(info.awsDatasource),
      'var-region='             + encodeURIComponent(info.cloudwatchRegion),
      'var-cluster_datasource=' + encodeURIComponent(info.clusterDatasource),
      'var-namespace='          + encodeURIComponent(ns),
      'var-cluster='            + encodeURIComponent(info.akpCluster),
      'var-persistentvolumeclaim=%24__all',
      'var-pod=%24__all',
      'from=now-6h',
      'to=now',
      'timezone=utc',
      'var-persistentvolume=%24__all',
      'var-volume_id=%24__all',
    ];
    return PVC_BASE + '?' + parts.join('&');
  }

  /* ── environment extraction ─────────────────────────────────────────────── */

  /**
   * Extract the environment name from any supported customer URL.
   *
   * Supported patterns (v1.2.0):
   *
   *   1. *.apptio.com
   *      csbox-emea-r12.apptio.com           → "csbox-emea-r12"
   *      csbox-us-east-r12.apptio.com        → "csbox-us-east-r12"
   *
   *   2. *.apps.papt.to  (BIIT internal / AKP proxy pages)
   *      csbox-us-east-r12.apps.papt.to      → "csbox-us-east-r12"
   *      csbox-us-east-r12.apps.papt.to/biit/data/... → "csbox-us-east-r12"
   *
   * In both cases the environment name is the leading DNS label of the subdomain.
   *
   * Returns null when no environment can be extracted.
   */
  function extractEnv(url) {
    if (!url) return null;
    try {
      var host = new URL(url).hostname.toLowerCase();

      // Pattern 1: {env}.apptio.com
      if (host.endsWith('.apptio.com')) {
        // Grab the first DNS label - everything before the first "."
        var label = host.split('.')[0];
        if (label) return label;
      }

      // Pattern 2: {env}.apps.papt.to
      if (host.endsWith('.apps.papt.to')) {
        var label2 = host.split('.')[0];
        if (label2) return label2;
      }
    } catch (_) { /* ignore malformed URLs */ }
    return null;
  }

  /* ── HTML helpers ─────────────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function buildCard(id, provider, name, desc, note) {
    var badge = provider === 'splunk'
      ? '<span class="edl-badge edl-badge--splunk">Splunk</span>'
      : '<span class="edl-badge edl-badge--grafana">Grafana</span>';
    return (
      '<div class="edl-dash-card" role="button" tabindex="0"' +
          ' data-dashboard-id="' + esc(id) + '"' +
          ' title="Open ' + esc(name) + ' in a new tab">' +
        '<div class="edl-dash-card__header">' +
          '<div class="edl-dash-card__title-row">' + badge +
            '<span class="edl-dash-card__name">' + esc(name) + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="edl-dash-card__desc">' + esc(desc) + '</div>' +
        (note ? '<div class="edl-dash-card__note">' + esc(note) + '</div>' : '') +
        '<div class="edl-dash-card__actions">' +
          '<button class="rc-btn rc-btn--primary rc-btn--sm edl-open-btn"' +
              ' data-dashboard-id="' + esc(id) + '"' +
              ' type="button" title="Open ' + esc(name) + ' in a new tab">' +
            '↗ Open' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  /**
   * Custom card for the PVC dashboard - has an extra prominent callout
   * telling the engineer they must select a PVC in Grafana after opening.
   */
  function buildCardPvc() {
    var id   = 'grafana-pvc';
    var name = 'AKP BIIT Persistent Volumes';
    var badge = '<span class="edl-badge edl-badge--grafana">Grafana</span>';
    return (
      '<div class="edl-dash-card" role="button" tabindex="0"' +
          ' data-dashboard-id="' + id + '"' +
          ' title="Open ' + name + ' in a new tab">' +
        '<div class="edl-dash-card__header">' +
          '<div class="edl-dash-card__title-row">' + badge +
            '<span class="edl-dash-card__name">' + name + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="edl-dash-card__desc">' +
          'Cluster, region and namespace are auto-filled from the environment.' +
        '</div>' +
        '<div class="edl-pvc-callout">' +
          '<span class="edl-pvc-callout__icon">👆</span>' +
          '<div class="edl-pvc-callout__text">' +
            '<strong>Manual step required in Grafana:</strong><br>' +
            'After opening, select the <code>persistentvolumeclaim</code> ' +
            'from the dropdown at the top of the dashboard to see data.' +
          '</div>' +
        '</div>' +
        '<div class="edl-dash-card__actions">' +
          '<button class="rc-btn rc-btn--primary rc-btn--sm edl-open-btn"' +
              ' data-dashboard-id="' + id + '"' +
              ' type="button" title="Open ' + name + ' in a new tab">' +
            '↗ Open' +
          '</button>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── render (synchronous - no async work here) ────────────────────────── */

  function render() {
    var el = document.getElementById('edl-container');
    if (!el) return;

    el.innerHTML =
      '<p class="edl-hint">Environment is read from the active customer tab when you click Open. ' +
      'Supported: <code>*.apptio.com</code> and <code>*.apps.papt.to</code></p>' +

      /* ── Splunk ─────────────────────────────────────────────────────── */
      '<div class="edl-provider-group">' +
        '<div class="rc-ops-section-header">' +
          '<span class="rc-ops-section-header__label">Splunk</span>' +
          '<span class="rc-ops-section-header__count">2</span>' +
        '</div>' +
        '<div class="edl-card-grid">' +
          buildCard(
            'string-usage', 'splunk',
            'String Usage',
            'String computation usage - last 30 days.',
            'Dynamic: form.selectedPrefix = env'
          ) +
          buildCard(
            'calculation-profiler', 'splunk',
            'Background Calculation Profiler',
            'Background calc jobs - last calendar month.',
            'Dynamic: form.selectedContainerPrefix = env'
          ) +
        '</div>' +
      '</div>' +

      /* ── Grafana ─────────────────────────────────────────────────────── */
      '<div class="edl-provider-group">' +
        '<div class="rc-ops-section-header">' +
          '<span class="rc-ops-section-header__label">Grafana</span>' +
          '<span class="rc-ops-section-header__count">2</span>' +
        '</div>' +
        '<div class="edl-card-grid">' +
          buildCard(
            'grafana-deployments', 'grafana',
            'AKP BIIT Deployments',
            'Kubernetes deployment status - last 1 hour.',
            'Dynamic: namespace = f-{env}, deployment = env'
          ) +
          buildCardPvc() +
        '</div>' +
      '</div>' +

      '</div>';
  }

  /* ── click handler (delegated - attached once in onNavigate) ─────────────── */

  function handleOpen(dashboardId) {
    // Query ONLY the active tab in the focused window (Issue #6).
    // currentWindow: true in the popup/side panel context resolves to the window
    // hosting the extension UI - always the user's currently focused window.
    // This prevents selecting a customer tab from a background window and
    // launching a dashboard for the wrong environment.
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      var tab = (tabs || [])[0];
      var env = tab && tab.url ? extractEnv(tab.url) : null;
      var usedUrl = tab ? (tab.url || '') : '';

      if (!env) {
        app().addNotification(
          'Env Dashboards - No Environment Detected',
          'No customer environment tab detected. Open a customer environment (e.g. csbox-emea-r12.apptio.com or csbox-us-east-r12.apps.papt.to) and try again.',
          'warning', PLUGIN_ID
        );
        app().addLog('warning', PLUGIN_ID,
          'Open attempted but no Apptio/PAPT tab active.');
        return;
      }

      var dashUrl;
      switch (dashboardId) {
        case 'string-usage':           dashUrl = buildStringUsage(env);    break;
        case 'calculation-profiler':   dashUrl = buildCalcProfiler(env);   break;
        case 'grafana-deployments':    dashUrl = buildDeployments(env);    break;
        case 'grafana-pvc':            dashUrl = buildPvc(env);            break;
        default:
          app().addLog('warning', PLUGIN_ID, 'Unknown dashboard id: ' + dashboardId);
          return;
      }

      // buildPvc() returns null for environments with unknown regions.
      // Guard here to prevent passing null to chrome.tabs.create().
      if (!dashUrl) {
        app().addNotification(
          'Env Dashboards - Region Not Recognised',
          'Cannot build dashboard URL: region for "' + env + '" is not in the region map. ' +
          'Supported region tokens: us-east, us-west, emea, apac.',
          'warning', PLUGIN_ID
        );
        app().addLog('warning', PLUGIN_ID,
          'buildUrl returned null for dashboardId=' + dashboardId + ' env=' + env);
        return;
      }

      chrome.tabs.create({ url: dashUrl, active: true });
      app().addNotification(
        'Dashboard Opened',
        dashboardId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) + ' - ' + env,
        'success', PLUGIN_ID
      );
      app().addLog('info', PLUGIN_ID,
        'Opened ' + dashboardId + ' for env=' + env + ' (from ' + usedUrl + ')');

      // Persist last-used env for the widget display
      chrome.storage.local.set({ [STORAGE_KEY]: { lastEnv: env } }, function () {
        if (chrome.runtime.lastError) {
          app().addLog('error', PLUGIN_ID,
            'Save failed: ' + chrome.runtime.lastError.message);
        }
      });
      var widget = document.getElementById('edl-widget-last-env');
      if (widget) widget.textContent = 'Last: ' + env;
    });
  }

  /* ── Tab system ──────────────────────────────────────────────────────────── */

  var _activeTab = 'dashboards'; // 'dashboards' | 'notifications'

  /* ── plugin lifecycle ────────────────────────────────────────────────────── */
  // Note: setTab() and renderPluginNotifications() removed in v1.43.4.
  // The Notifications tab was removed - plugin is now single-view (Dashboards only).
  // Plugin-scoped notifications are available in the platform Notifications Center.


  var _eventsAttached = false;

  function init() {
    // Wire both widget buttons (header ↗ and body "Open") - both navigate to the plugin view
    ['edl-widget-open-btn', 'edl-widget-launch-btn'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', function () {
          app().navigateTo('plugin-env-dashboards');
        });
      }
    });
  }

  function onNavigate() {
    app().addLog('info', PLUGIN_ID, 'Environment Dashboards Launcher opened');

    // Notifications tab removed in v1.43.4 - plugin is single-view (Dashboards only).
    // Plugin-scoped notifications are available in the platform Notifications Center.

    // Render the static card grid immediately - no async work
    render();

    // Attach the delegated click handler once per session.
    // Re-render on every navigate means the container is replaced, but the
    // delegated handler is on #edl-container which is static in dashboard.html -
    // it persists across render() calls (innerHTML only replaces its children).
    if (!_eventsAttached) {
      _eventsAttached = true;
      var container = document.getElementById('edl-container');
      if (container) {
        // Delegated handler: click bubbles from .edl-open-btn / .edl-dash-card up to #edl-container
        container.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-dashboard-id]');
          if (!btn) return;
          e.preventDefault();
          handleOpen(btn.dataset.dashboardId);
        });
        // Keyboard activation for card role="button"
        container.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter' && e.key !== ' ') return;
          var card = e.target.closest('.edl-dash-card[data-dashboard-id]');
          if (!card) return;
          e.preventDefault();
          handleOpen(card.dataset.dashboardId);
        });
      }
    }

    // Restore last-used env in widget label (non-blocking)
    chrome.storage.local.get(STORAGE_KEY, function (result) {
      var d = result[STORAGE_KEY];
      var env = (d && typeof d.lastEnv === 'string') ? d.lastEnv : '';
      var widget = document.getElementById('edl-widget-last-env');
      if (widget) widget.textContent = env ? 'Last: ' + env : '';
    });
  }

  function onLeave() { /* no-op */ }

  /* ── self-registration ───────────────────────────────────────────────────── */

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.EnvDashboards = { init: init, onNavigate: onNavigate, onLeave: onLeave };

}());
