/**
 * LinkAura — theme-manager.js
 * Handles dark/light theme toggling, accent color updates,
 * background styles, and the particle canvas animation.
 */

'use strict';

(function () {
  const { $, loadStorage, saveStorage, hexToRgba, debounce } = window.LinkAuraUtils;

  /* ─────────────────────────────────────────
     State
  ───────────────────────────────────────── */
  let currentTheme = loadStorage('theme', 'dark');
  let currentAccent = loadStorage('accent', '#c4842a');
  let currentBg = loadStorage('bg', 'particles');
  let particleAnimFrame = null;
  let particles = [];

  /* ─────────────────────────────────────────
     Theme Toggle
  ───────────────────────────────────────── */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = $('#theme-toggle');
    if (btn) btn.setAttribute('aria-pressed', theme === 'light');
    saveStorage('theme', theme);
    currentTheme = theme;
    // Restart particles with new colors
    initParticles();
  }

  function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  /* ─────────────────────────────────────────
     Accent Color
  ───────────────────────────────────────── */
  function applyAccent(hex) {
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return;
    currentAccent = hex;
    saveStorage('accent', hex);

    const root = document.documentElement;
    root.style.setProperty('--accent', hex);
    root.style.setProperty('--accent-light', lightenHex(hex, 15));
    root.style.setProperty('--accent-dim', hexToRgba(hex, 0.18));
    root.style.setProperty('--accent-glow', hexToRgba(hex, 0.35));

    // Update active swatch UI
    document.querySelectorAll('.la-color-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color === hex);
    });
    const custom = $('#custom-color');
    if (custom) custom.value = hex;

    // Trigger preview refresh
    document.dispatchEvent(new CustomEvent('linkaura:previewrefresh'));
  }

  function lightenHex(hex, pct) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * pct / 100));
    const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * pct / 100));
    const b = Math.min(255, (num & 0xff) + Math.round(255 * pct / 100));
    return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
  }

  /* ─────────────────────────────────────────
     Background Style
  ───────────────────────────────────────── */
  function applyBackground(bg) {
    currentBg = bg;
    saveStorage('bg', bg);

    // Update button states
    document.querySelectorAll('.la-bg-btn').forEach(btn => {
      const active = btn.dataset.bg === bg;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });

    // Start/stop particle canvas
    if (bg === 'particles') {
      initParticles();
    } else {
      stopParticles();
      applyStaticBg(bg);
    }

    document.dispatchEvent(new CustomEvent('linkaura:previewrefresh'));
  }

  function applyStaticBg(style) {
    const canvas = $('#particles-canvas');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    const body = document.body;
    body.style.background = '';

    if (style === 'gradient') {
      body.style.background = `radial-gradient(ellipse at 20% 50%, ${hexToRgba(currentAccent, 0.08)} 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, ${hexToRgba(currentAccent, 0.05)} 0%, transparent 40%),
        var(--bg-base)`;
    } else if (style === 'mesh') {
      body.style.background = `
        linear-gradient(135deg, ${hexToRgba(currentAccent, 0.06)} 0%, transparent 50%),
        linear-gradient(225deg, ${hexToRgba(currentAccent, 0.04)} 0%, transparent 50%),
        var(--bg-base)`;
    } else if (style === 'minimal') {
      body.style.background = 'var(--bg-base)';
    }
  }

  /* ─────────────────────────────────────────
     Particle Canvas
  ───────────────────────────────────────── */
  const PARTICLE_COUNT = 55;

  class Particle {
    constructor(canvas) {
      this.canvas = canvas;
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * this.canvas.width;
      this.y = initial ? Math.random() * this.canvas.height : this.canvas.height + 10;
      this.size = Math.random() * 1.8 + 0.3;
      this.speedX = (Math.random() - 0.5) * 0.25;
      this.speedY = -(Math.random() * 0.35 + 0.08);
      this.opacity = Math.random() * 0.45 + 0.05;
      this.twinkleSpeed = Math.random() * 0.012 + 0.004;
      this.twinkleOffset = Math.random() * Math.PI * 2;
      this.life = 0;
      this.maxLife = Math.random() * 400 + 200;
    }

    update() {
      this.x += this.speedX;
      this.y += this.speedY;
      this.life++;
      if (this.y < -10 || this.life > this.maxLife) this.reset();
    }

    draw(ctx, accentRgba) {
      const twinkle = Math.sin(this.life * this.twinkleSpeed + this.twinkleOffset);
      const alpha = this.opacity * (0.6 + 0.4 * twinkle);
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = accentRgba;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function initParticles() {
    const canvas = $('#particles-canvas');
    if (!canvas) return;

    stopParticles();
    document.body.style.background = '';

    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    resize();
    window.addEventListener('resize', debounce(resize, 200));

    // Build particles
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle(canvas));

    // Parse accent color for particles
    const accentRgba = hexToRgba(currentAccent, 1);

    function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.update();
        p.draw(ctx, accentRgba);
      }
      ctx.globalAlpha = 1;
      particleAnimFrame = requestAnimationFrame(loop);
    }

    loop();
  }

  function stopParticles() {
    if (particleAnimFrame) {
      cancelAnimationFrame(particleAnimFrame);
      particleAnimFrame = null;
    }
    particles = [];
  }

  /* ─────────────────────────────────────────
     Color Palette Presets
  ───────────────────────────────────────── */
  const COLOR_PALETTE = [
    { hex: '#c4842a', name: 'Gold'       },
    { hex: '#a78bfa', name: 'Lavender'   },
    { hex: '#34d399', name: 'Emerald'    },
    { hex: '#f472b6', name: 'Rose'       },
    { hex: '#60a5fa', name: 'Sky'        },
    { hex: '#f97316', name: 'Orange'     },
    { hex: '#e879f9', name: 'Fuchsia'    },
    { hex: '#2dd4bf', name: 'Teal'       },
    { hex: '#fb7185', name: 'Pink'       },
    { hex: '#a3e635', name: 'Lime'       },
  ];

  function renderColorPalette() {
    const container = $('#color-palette');
    if (!container) return;
    container.innerHTML = '';

    for (const { hex, name } of COLOR_PALETTE) {
      const swatch = document.createElement('button');
      swatch.className = `la-color-swatch${hex === currentAccent ? ' active' : ''}`;
      swatch.dataset.color = hex;
      swatch.style.backgroundColor = hex;
      swatch.setAttribute('aria-label', `${name} accent`);
      swatch.setAttribute('title', name);
      swatch.addEventListener('click', () => applyAccent(hex));
      container.appendChild(swatch);
    }
  }

  /* ─────────────────────────────────────────
     Event Binding
  ───────────────────────────────────────── */
  function bindEvents() {
    // Theme toggle button
    const themeBtn = $('#theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    // Custom color picker
    const colorInput = $('#custom-color');
    if (colorInput) {
      colorInput.addEventListener('input', debounce(e => applyAccent(e.target.value), 80));
      colorInput.value = currentAccent;
    }

    // Background style buttons
    document.querySelectorAll('.la-bg-btn').forEach(btn => {
      btn.addEventListener('click', () => applyBackground(btn.dataset.bg));
    });
  }

  /* ─────────────────────────────────────────
     Init
  ───────────────────────────────────────── */
  function init() {
    applyTheme(currentTheme);
    applyAccent(currentAccent);
    renderColorPalette();
    bindEvents();

    // Apply saved background
    if (currentBg === 'particles') {
      initParticles();
    } else {
      applyStaticBg(currentBg);
    }

    // Mark the correct bg button active
    document.querySelectorAll('.la-bg-btn').forEach(btn => {
      const active = btn.dataset.bg === currentBg;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active);
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─────────────────────────────────────────
     Public API
  ───────────────────────────────────────── */
  window.LinkAuraTheme = {
    applyTheme,
    toggleTheme,
    applyAccent,
    applyBackground,
    renderColorPalette,
    getCurrentAccent: () => currentAccent,
    getCurrentTheme: () => currentTheme,
    getCurrentBg: () => currentBg,
    COLOR_PALETTE,
  };
})();
