// ─── Snake Plugin - Retro Arcade Snake ───────────────────────────────────────
//
// Rendering:
//   - HUD on canvas: score top-left, "BEST XXXX" top-right, crisp integer coords
//   - Dotted border rectangle drawn inside the play field (matches reference)
//   - Food: solid filled square (CELL-1 × CELL-1) - larger for visibility
//   - Snake: uniform solid square segments (CELL-1 × CELL-1)
//   - Colors: #9CBC0F LCD green, #0F380F dark ink
//   - CELL=10px → larger canvas, no CSS upscale blur
//
// Storage:
//   SNK_STORAGE_KEY  (chrome.storage.local)  →  { highScore }
//   snakeSpeed       (appSettings, synced)   →  'slow' | 'classic' | 'fast'

(function() {
  'use strict';

  const PLUGIN_ID       = 'com.replycators.snake';
  const SNK_STORAGE_KEY = 'rc:plugin:' + PLUGIN_ID + ':state';

  // ── Palette ────────────────────────────────────────────────────────────────
  const LCD_BG = '#9CBC0F';   // Retro LCD green
  const LCD_FG = '#0F380F';   // Retro LCD dark ink

  // ── Grid ───────────────────────────────────────────────────────────────────
  // 40 cols × 22 rows at 10px each → 400×220px canvas.
  // CELL=10 gives larger, more visible segments and matches the reference scale.
  // Top 2 rows = HUD band (20px). Bottom 20 rows = play field.
  const CELL      = 10;   // px per grid cell
  const COLS      = 40;   // total grid columns
  const HUD_ROWS  = 2;    // rows reserved for the HUD score band
  const PLAY_ROWS = 20;   // rows for the play field (border included)
  const ROWS      = HUD_ROWS + PLAY_ROWS;   // 22 total
  const BORDER    = 1;    // cells of border on each side of play field

  // Play field coordinate bounds (cells, inclusive)
  const PF_X0 = BORDER;
  const PF_X1 = COLS - BORDER - 1;
  const PF_Y0 = HUD_ROWS + BORDER;
  const PF_Y1 = HUD_ROWS + PLAY_ROWS - BORDER - 1;

  // Canvas pixel dimensions
  const C_W = COLS * CELL;
  const C_H = ROWS * CELL;

  // ── Speed table ────────────────────────────────────────────────────────────
  const SPEED_TABLE = { slow: 220, classic: 135, fast: 70 };

  // ── State ──────────────────────────────────────────────────────────────────
  let canvas, ctx;
  let snake     = [];
  let dir       = {x: 1, y: 0};
  let nextDir   = {x: 1, y: 0};
  let food      = {x: 0, y: 0};
  let score     = 0;
  let highScore = 0;
  let gameState = 'start';   // 'start' | 'running' | 'paused' | 'over'
  let tickInterval = SPEED_TABLE['classic'];
  let lastTick  = 0;
  let rafId     = null;
  let initialised = false;

  function app() { return window.ReplyCatorsApp; }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function placeFoodAt() {
    const bodySet = new Set(snake.map(s => s.x + ',' + s.y));
    let fx, fy, tries = 0;
    do {
      fx = rnd(PF_X0, PF_X1);
      fy = rnd(PF_Y0, PF_Y1);
      tries++;
    } while (bodySet.has(fx + ',' + fy) && tries < 500);
    food = {x: fx, y: fy};
  }

  // ── Game logic ─────────────────────────────────────────────────────────────

  function resetGame() {
    const midX = Math.floor(COLS / 2);
    const midY = Math.floor(HUD_ROWS + PLAY_ROWS / 2);
    snake = [
      {x: midX,     y: midY},
      {x: midX - 1, y: midY},
      {x: midX - 2, y: midY},
    ];
    dir     = {x: 1, y: 0};
    nextDir = {x: 1, y: 0};
    score   = 0;
    placeFoodAt();
  }

  function tick() {
    dir = {x: nextDir.x, y: nextDir.y};

    const head    = snake[0];
    const newHead = {x: head.x + dir.x, y: head.y + dir.y};

    // Wall collision - play field boundary
    if (newHead.x < PF_X0 || newHead.x > PF_X1 ||
        newHead.y < PF_Y0 || newHead.y > PF_Y1) {
      gameOver();
      return;
    }

    // Self collision
    for (let i = 0; i < snake.length; i++) {
      if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
        gameOver();
        return;
      }
    }

    snake.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
      score += 10;
      if (score > highScore) {
        highScore = score;
        // Defer storage write so it never blocks the current animation frame
        setTimeout(snkSaveHighScore, 0);
      }
      placeFoodAt();
    } else {
      snake.pop();
    }
  }

  function gameOver() {
    gameState = 'over';
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    draw();
    showOverlay('over');
    app().addLog('info', PLUGIN_ID, 'Game over - score: ' + score);
  }

  // ── Rendering ──────────────────────────────────────────────────────────────
  //
  // Canvas layout:
  //   Rows 0-1  (0-15px) : HUD band - score left, high-score right
  //   Row  2    (16px)   : 2px dividing line (rows 14-15)
  //   Rows 2-21 (16-175px): play field with single thick (2px) border
  //
  // All coordinates are whole integers - no half-pixel bleed.

  function draw() {
    if (!ctx) return;

    // 1. Clear to LCD green
    ctx.fillStyle = LCD_BG;
    ctx.fillRect(0, 0, C_W, C_H);

    // 2. HUD scores
    drawHUD();

    // 3. Dividing line: 2px strip at the bottom of the HUD band
    ctx.fillStyle = LCD_FG;
    ctx.fillRect(0, HUD_ROWS * CELL - 2, C_W, 2);

    // 4. Single thick border
    drawBorder();

    // 5. Food
    drawFood();

    // 6. Snake
    drawSnake();
  }

  // ── HUD ────────────────────────────────────────────────────────────────────
  // Render score digits directly on canvas with integer pixel coordinates
  // so text stays sharp regardless of CSS scaling ratio.
  // Left side: current score (e.g. "0050")
  // Right side: "BEST 0050" (matches reference screenshot)

  function drawHUD() {
    ctx.fillStyle    = LCD_FG;
    ctx.font         = 'bold ' + (CELL + 2) + 'px "Courier New", monospace';
    ctx.textBaseline = 'alphabetic';

    // Baseline sits 2px above the dividing line
    const by = HUD_ROWS * CELL - 2;  // integer baseline

    // Score - left-aligned, 4px left margin
    ctx.textAlign = 'left';
    ctx.fillText(pad4(score), 4, by);

    // High score - right-aligned with "BEST " label, 4px right margin
    ctx.textAlign = 'right';
    ctx.fillText('BEST ' + pad4(highScore), C_W - 4, by);
  }

  // ── Border ─────────────────────────────────────────────────────────────────
  // Four solid filled rectangles - one per side, 2px thick.
  // No dots, no dashes, no loops - clean continuous lines on all four sides.

  function drawBorder() {
    ctx.fillStyle = LCD_FG;

    const T  = 2;                      // border thickness in px
    const x0 = PF_X0 * CELL;
    const y0 = PF_Y0 * CELL;
    const x1 = (PF_X1 + 1) * CELL;
    const y1 = (PF_Y1 + 1) * CELL;
    const w  = x1 - x0;
    const h  = y1 - y0;

    ctx.fillRect(x0,      y0,      w,  T);  // top
    ctx.fillRect(x0,      y1 - T,  w,  T);  // bottom
    ctx.fillRect(x0,      y0,      T,  h);  // left
    ctx.fillRect(x1 - T,  y0,      T,  h);  // right
  }

  // ── Food ───────────────────────────────────────────────────────────────────
  // Solid filled square - 1px inset on each side for a clean gap between cells.
  // At CELL=10, this gives an 8×8 solid block - clearly visible on the LCD.

  function drawFood() {
    ctx.fillStyle = LCD_FG;
    const SZ  = CELL - 2;   // 8px at CELL=10
    const off = 1;
    ctx.fillRect(food.x * CELL + off, food.y * CELL + off, SZ, SZ);
  }

  // ── Snake ──────────────────────────────────────────────────────────────────
  // Uniform solid square segments - every cell drawn identically.
  // (CELL-2) × (CELL-2) block with a 1px gap on every side.
  // At CELL=10 this is an 8×8 solid block - ~15-20% larger than the previous 6×6.

  function drawSnake() {
    ctx.fillStyle = LCD_FG;
    const SZ  = CELL - 2;   // 8px at CELL=10
    const off = 1;
    snake.forEach(function(seg) {
      ctx.fillRect(seg.x * CELL + off, seg.y * CELL + off, SZ, SZ);
    });
  }

  // ── Overlay (start / pause / game-over) ────────────────────────────────────

  function showOverlay(which) {
    const overlay = document.getElementById('snk-overlay');
    if (!overlay) return;
    const title = overlay.querySelector('.snk-overlay-title');
    const sub   = overlay.querySelector('.snk-overlay-subtitle');
    const btn   = document.getElementById('snk-overlay-btn');
    overlay.classList.remove('snk-overlay--hidden');
    if (which === 'start') {
      if (title) title.textContent = 'SNAKE';
      if (sub)   sub.textContent   = 'BEST: ' + pad4(highScore) + '\nARROW KEYS / WASD';
      if (btn)   btn.textContent   = 'START';
    } else if (which === 'paused') {
      if (title) title.textContent = 'PAUSED';
      if (sub)   sub.textContent   = 'SCORE: ' + pad4(score);
      if (btn)   btn.textContent   = 'RESUME';
    } else if (which === 'over') {
      if (title) title.textContent = 'GAME OVER';
      if (sub)   sub.textContent   = pad4(score) + '\nBEST: ' + pad4(highScore);
      if (btn)   btn.textContent   = 'RETRY';
    }
  }

  function hideOverlay() {
    const overlay = document.getElementById('snk-overlay');
    if (overlay) overlay.classList.add('snk-overlay--hidden');
  }

  // ── Score helpers ──────────────────────────────────────────────────────────

  function pad4(n) { return String(n).padStart(4, '0'); }

  // Update the widget high-score value (dashboard card) only.
  // The in-game HUD is drawn directly on canvas - no HTML elements needed.
  function snkUpdateWidget() {
    const wHiEl = document.getElementById('snk-widget-hi-val');
    if (wHiEl) wHiEl.textContent = highScore;
  }

  function snkLoadHighScore(cb) {
    chrome.storage.local.get(SNK_STORAGE_KEY, function(result) {
      const stored = result[SNK_STORAGE_KEY];
      if (stored && typeof stored.highScore === 'number') {
        highScore = stored.highScore;
      }
      if (cb) cb();
    });
  }

  function snkSaveHighScore() {
    chrome.storage.local.set({ [SNK_STORAGE_KEY]: { highScore } });
  }

  // ── Game loop ──────────────────────────────────────────────────────────────
  // lastTick = -1 is the "not yet started" sentinel.
  // On the very first frame we capture the real timestamp so the loop never
  // fast-forwards through a backlog of "missed" ticks from t=0.

  function loop(timestamp) {
    if (gameState !== 'running') return;
    rafId = requestAnimationFrame(loop);
    if (lastTick < 0) {
      // First frame - anchor the clock here; fire first tick next interval.
      lastTick = timestamp;
      return;
    }
    if (timestamp - lastTick >= tickInterval) {
      // Advance by exactly one interval to keep cadence stable.
      lastTick += tickInterval;
      tick();
      draw();
    }
  }

  function startGame() {
    resetGame();
    gameState = 'running';
    hideOverlay();
    lastTick = -1;   // sentinel: captured on first RAF frame
    draw();
    snkUpdateWidget();
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(loop);
    app().addLog('info', PLUGIN_ID, 'Game started');
  }

  function pauseGame() {
    if (gameState !== 'running') return;
    gameState = 'paused';
    stopLoop();
    showOverlay('paused');
    app().addLog('info', PLUGIN_ID, 'Game paused');
  }

  function resumeGame() {
    if (gameState !== 'paused') return;
    gameState = 'running';
    hideOverlay();
    lastTick = -1;   // sentinel: re-anchor clock on first RAF frame after resume
    rafId = requestAnimationFrame(loop);
    app().addLog('info', PLUGIN_ID, 'Game resumed');
  }

  function stopLoop() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
  }

  // ── Input ──────────────────────────────────────────────────────────────────
  // No inputLocked throttle - direction queued immediately.
  // Only guards: no 180° reversal, ignore same-axis repeat.

  function handleKey(e) {
    const KEY_MAP = {
      ArrowUp:    {x:  0, y: -1},
      ArrowDown:  {x:  0, y:  1},
      ArrowLeft:  {x: -1, y:  0},
      ArrowRight: {x:  1, y:  0},
      w:          {x:  0, y: -1},
      s:          {x:  0, y:  1},
      a:          {x: -1, y:  0},
      d:          {x:  1, y:  0},
    };
    const mapped = KEY_MAP[e.key];
    if (!mapped) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (gameState === 'start' || gameState === 'over') startGame();
        else if (gameState === 'running') pauseGame();
        else if (gameState === 'paused')  resumeGame();
      }
      return;
    }
    e.preventDefault();
    if (gameState === 'start' || gameState === 'over') { startGame(); return; }
    if (gameState === 'paused') return;

    // Prevent 180-degree reversal
    if (mapped.x !== 0 && dir.x !== 0) return;
    if (mapped.y !== 0 && dir.y !== 0) return;

    nextDir = mapped;
  }

  function attachKeys() { document.addEventListener('keydown', handleKey); }
  function detachKeys()  { document.removeEventListener('keydown', handleKey); }

  // ── Init ───────────────────────────────────────────────────────────────────

  function init(speed) {
    snkLoadHighScore(function() { snkUpdateWidget(); });
    if (speed) applySpeed(speed);

    const widgetBtn = document.getElementById('snk-widget-play-btn');
    if (widgetBtn) widgetBtn.addEventListener('click', function() {
      window.ReplyCatorsApp?.navigateTo?.('plugin-snake');
    });

    app().addLog('info', PLUGIN_ID, 'Snake plugin ready');
  }

  function initView() {
    if (initialised) return;
    initialised = true;

    canvas = document.getElementById('snk-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    // HiDPI / Retina support:
    // Set the canvas backing buffer to physical pixels so text and lines are
    // razor-sharp on high-density displays.  The CSS size stays at the logical
    // grid size (C_W × C_H) and the context is pre-scaled by DPR so all draw
    // calls continue to use the same logical-pixel coordinates unchanged.
    const dpr = window.devicePixelRatio || 1;
    canvas.width  = C_W * dpr;
    canvas.height = C_H * dpr;
    canvas.style.width  = C_W + 'px';
    canvas.style.height = C_H + 'px';
    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    snkLoadHighScore(function() {
      snkUpdateWidget();
      draw();
      showOverlay('start');
      app().addLog('info', PLUGIN_ID, 'Snake view initialised - high score: ' + highScore);
    });

    // Overlay button
    const overlayBtn = document.getElementById('snk-overlay-btn');
    if (overlayBtn) {
      overlayBtn.addEventListener('click', function() {
        if (gameState === 'start' || gameState === 'over') startGame();
        else if (gameState === 'paused') resumeGame();
      });
    }

    // Pause button
    const pauseBtn = document.getElementById('snk-pause-btn');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', function() {
        if (gameState === 'running') pauseGame();
        else if (gameState === 'paused') resumeGame();
      });
    }

    // D-pad buttons
    function dpadPress(key) {
      return function() { handleKey({ key: key, preventDefault: function(){} }); };
    }
    const dUp    = document.getElementById('snk-dpad-up');
    const dDown  = document.getElementById('snk-dpad-down');
    const dLeft  = document.getElementById('snk-dpad-left');
    const dRight = document.getElementById('snk-dpad-right');
    if (dUp)    dUp.addEventListener('click',    dpadPress('ArrowUp'));
    if (dDown)  dDown.addEventListener('click',  dpadPress('ArrowDown'));
    if (dLeft)  dLeft.addEventListener('click',  dpadPress('ArrowLeft'));
    if (dRight) dRight.addEventListener('click', dpadPress('ArrowRight'));

    // Speed buttons
    ['slow', 'classic', 'fast'].forEach(function(sp) {
      const btn = document.getElementById('snk-speed-' + sp);
      if (btn) {
        btn.addEventListener('click', function() {
          const s = app().getAppSettings();
          s.snakeSpeed = sp;
          app().persistAppSettings();
          applySpeed(sp);
          app().addLog('info', PLUGIN_ID, 'Snake speed set to: ' + sp);
        });
      }
    });
  }

  function applySpeed(speed) {
    tickInterval = SPEED_TABLE[speed] || SPEED_TABLE['classic'];
    ['slow', 'classic', 'fast'].forEach(function(s) {
      const btn = document.getElementById('snk-speed-' + s);
      if (btn) btn.classList.toggle('snk-speed-btn--active', s === speed);
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  const plugin = {
    id:   PLUGIN_ID,
    init: init,
    onNavigate: function() {
      initView();
      attachKeys();
      snkUpdateWidget();
      if (gameState === 'running') {
        if (rafId) cancelAnimationFrame(rafId);
        lastTick = -1;   // sentinel: re-anchor clock on first RAF frame
        rafId = requestAnimationFrame(loop);
      }
    },
    onLeave: function() {
      detachKeys();
      stopLoop();
      if (gameState === 'running') {
        gameState = 'paused';
        if (canvas && ctx) draw();
      }
    },
    applySpeed:    applySpeed,
    getHighScore:  function() { return highScore; },
    loadHighScore: snkLoadHighScore,
  };

  window.ReplyCatorsPlugins = window.ReplyCatorsPlugins || {};
  window.ReplyCatorsPlugins.Snake = plugin;
})();
