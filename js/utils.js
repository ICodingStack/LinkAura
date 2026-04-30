/**
 * LinkAura — utils.js
 * Shared utility functions used across all modules.
 */

'use strict';

/* ─────────────────────────────────────────
   DOM Helpers
───────────────────────────────────────── */

/** Shorthand querySelector */
const $ = (selector, parent = document) => parent.querySelector(selector);

/** Shorthand querySelectorAll → Array */
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

/** Create element with optional attributes and children */
function createElement(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === 'class') el.className = val;
    else if (key.startsWith('on') && typeof val === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), val);
    } else if (key === 'html') el.innerHTML = val;
    else el.setAttribute(key, val);
  }
  for (const child of children) {
    if (typeof child === 'string') el.appendChild(document.createTextNode(child));
    else if (child instanceof Node) el.appendChild(child);
  }
  return el;
}

/* ─────────────────────────────────────────
   Toast Notification System
───────────────────────────────────────── */

const TOAST_ICONS = {
  success: '✓',
  error: '✕',
  info: '✦',
};

/**
 * Show a toast notification.
 * @param {string} message - Text to display
 * @param {'success'|'error'|'info'} type
 * @param {number} duration - ms before auto-dismiss
 */
function showToast(message, type = 'info', duration = 3200) {
  const container = $('#toast-container');
  if (!container) return;

  const toast = createElement('div', { class: `la-toast la-toast--${type}` });
  toast.innerHTML = `
    <span class="la-toast__icon">${TOAST_ICONS[type] || '✦'}</span>
    <span class="la-toast__message">${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);

  // Auto-remove
  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/* ─────────────────────────────────────────
   String Utilities
───────────────────────────────────────── */

/** Sanitize string to safe HTML text */
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Slugify a string → URL-safe */
function slugify(str = '') {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Truncate string to max length with ellipsis */
function truncate(str = '', max = 60) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

/** Generate a short random ID */
function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Capitalize first letter */
function capitalize(str = '') {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ─────────────────────────────────────────
   URL Utilities
───────────────────────────────────────── */

/** Ensure a URL has a protocol prefix */
function ensureHttps(url = '') {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

/** Extract clean domain from URL */
function getDomain(url = '') {
  try {
    return new URL(ensureHttps(url)).hostname.replace('www.', '');
  } catch {
    return url;
  }
}

/** Detect if a string looks like a URL */
function isUrl(str = '') {
  try {
    new URL(ensureHttps(str));
    return true;
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────
   Local Storage Helpers
───────────────────────────────────────── */

const STORAGE_PREFIX = 'linkaura_';

/**
 * Save JSON data to localStorage.
 * @param {string} key
 * @param {*} data
 */
function saveStorage(key, data) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('[LinkAura] Storage save failed:', e);
    return false;
  }
}

/**
 * Load JSON data from localStorage.
 * @param {string} key
 * @param {*} fallback - default if key not found
 */
function loadStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw !== null ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('[LinkAura] Storage load failed:', e);
    return fallback;
  }
}

/**
 * Remove a key from localStorage.
 * @param {string} key
 */
function removeStorage(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (e) {
    console.warn('[LinkAura] Storage remove failed:', e);
  }
}

/**
 * List all LinkAura storage keys (without prefix).
 */
function listStorageKeys() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      keys.push(key.slice(STORAGE_PREFIX.length));
    }
  }
  return keys;
}

/* ─────────────────────────────────────────
   Debounce / Throttle
───────────────────────────────────────── */

/**
 * Debounce a function call.
 * @param {Function} fn
 * @param {number} delay - ms
 */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle a function call.
 * @param {Function} fn
 * @param {number} limit - ms
 */
function throttle(fn, limit = 100) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/* ─────────────────────────────────────────
   Animation Helpers
───────────────────────────────────────── */

/**
 * Animate element with CSS class, remove after transition.
 * @param {HTMLElement} el
 * @param {string} className
 * @param {number} duration - ms
 */
function animateClass(el, className, duration = 600) {
  el.classList.add(className);
  setTimeout(() => el.classList.remove(className), duration);
}

/**
 * Stagger-animate a list of elements.
 * @param {HTMLElement[]} els
 * @param {string} className
 * @param {number} stagger - ms between each
 */
function staggerAnimate(els, className, stagger = 60) {
  els.forEach((el, i) => {
    el.style.animationDelay = `${i * stagger}ms`;
    el.classList.add(className);
  });
}

/* ─────────────────────────────────────────
   Image File → Base64
───────────────────────────────────────── */

/**
 * Convert a File object to a base64 data URL.
 * @param {File} file
 * @returns {Promise<string>}
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─────────────────────────────────────────
   Clipboard
───────────────────────────────────────── */

/**
 * Copy text to clipboard with fallback.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

/* ─────────────────────────────────────────
   Color Utilities
───────────────────────────────────────── */

/**
 * Lighten a hex color by a percentage.
 * @param {string} hex
 * @param {number} pct 0–100
 */
function lightenColor(hex, pct) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + Math.round(255 * pct / 100));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(255 * pct / 100));
  const b = Math.min(255, (num & 0xff) + Math.round(255 * pct / 100));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Convert hex to rgba string.
 * @param {string} hex
 * @param {number} alpha 0–1
 */
function hexToRgba(hex, alpha = 1) {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ─────────────────────────────────────────
   Date Formatting
───────────────────────────────────────── */

/**
 * Format a timestamp as a friendly relative date.
 * @param {number} timestamp - Unix ms
 */
function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

/* ─────────────────────────────────────────
   Expose globally
───────────────────────────────────────── */
window.LinkAuraUtils = {
  $, $$, createElement,
  showToast,
  escapeHtml, slugify, truncate, uid, capitalize,
  ensureHttps, getDomain, isUrl,
  saveStorage, loadStorage, removeStorage, listStorageKeys,
  debounce, throttle,
  animateClass, staggerAnimate,
  fileToBase64,
  copyToClipboard,
  lightenColor, hexToRgba,
  timeAgo,
};
