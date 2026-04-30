/**
 * LinkAura — link-manager.js
 * Manages link cards with full CRUD, drag-and-drop reordering,
 * icon detection, and live preview updates.
 */

'use strict';

(function () {
  const {
    $, $$, createElement, uid, slugify, escapeHtml,
    ensureHttps, getDomain, saveStorage, loadStorage,
    showToast, debounce, animateClass,
  } = window.LinkAuraUtils;

  /* ─────────────────────────────────────────
     Link Data Model
  ───────────────────────────────────────── */

  /**
   * @typedef {Object} LinkItem
   * @property {string} id
   * @property {string} title
   * @property {string} url
   * @property {string} icon     - emoji or icon key
   * @property {boolean} active
   */

  let links = [];
  let dragSrc = null; // currently dragged card element

  /* ─────────────────────────────────────────
     Icon Detection
  ───────────────────────────────────────── */

  const ICON_MAP = [
    { patterns: ['instagram'],          icon: '📸' },
    { patterns: ['twitter', 'x.com'],   icon: '𝕏'  },
    { patterns: ['youtube'],            icon: '▶️' },
    { patterns: ['tiktok'],             icon: '🎵' },
    { patterns: ['spotify'],            icon: '🎧' },
    { patterns: ['github'],             icon: '🐙' },
    { patterns: ['linkedin'],           icon: '💼' },
    { patterns: ['facebook'],           icon: '👤' },
    { patterns: ['twitch'],             icon: '🎮' },
    { patterns: ['pinterest'],          icon: '📌' },
    { patterns: ['snapchat'],           icon: '👻' },
    { patterns: ['discord'],            icon: '💬' },
    { patterns: ['telegram'],           icon: '✈️' },
    { patterns: ['whatsapp'],           icon: '💬' },
    { patterns: ['substack'],           icon: '📝' },
    { patterns: ['medium'],             icon: '✍️' },
    { patterns: ['patreon'],            icon: '🎁' },
    { patterns: ['ko-fi', 'buymeacoffee', 'gumroad'], icon: '☕' },
    { patterns: ['etsy'],               icon: '🛍️' },
    { patterns: ['shopify', 'shop'],    icon: '🛒' },
    { patterns: ['behance'],            icon: '🎨' },
    { patterns: ['dribbble'],           icon: '🏀' },
    { patterns: ['figma'],              icon: '🖌️' },
    { patterns: ['notion'],             icon: '📓' },
    { patterns: ['calendly'],           icon: '📅' },
    { patterns: ['mailto:', 'email'],   icon: '✉️' },
    { patterns: ['podcast', 'anchor'],  icon: '🎙️' },
    { patterns: ['newsletter'],         icon: '📬' },
    { patterns: ['blog', 'post'],       icon: '📖' },
  ];

  function detectIcon(url = '', title = '') {
    const combined = (url + title).toLowerCase();
    for (const { patterns, icon } of ICON_MAP) {
      if (patterns.some(p => combined.includes(p))) return icon;
    }
    return '🔗';
  }

  /* ─────────────────────────────────────────
     Default Link Titles
  ───────────────────────────────────────── */

  function autoTitle(url = '') {
    const domain = getDomain(url);
    if (!domain) return 'My Link';
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }

  /* ─────────────────────────────────────────
     CRUD Operations
  ───────────────────────────────────────── */

  function addLink(overrides = {}) {
    const link = {
      id: uid('link'),
      title: overrides.title || 'New Link',
      url: overrides.url || '',
      icon: overrides.icon || '🔗',
      active: true,
      ...overrides,
    };
    links.push(link);
    persist();
    renderLinks();
    return link;
  }

  function updateLink(id, changes) {
    const idx = links.findIndex(l => l.id === id);
    if (idx === -1) return;
    links[idx] = { ...links[idx], ...changes };
    // Auto-detect icon if URL changed and no custom icon set
    if (changes.url || changes.title) {
      const l = links[idx];
      links[idx].icon = detectIcon(l.url, l.title);
    }
    persist();
    renderLinks();
    document.dispatchEvent(new CustomEvent('linkaura:previewrefresh'));
  }

  function removeLink(id) {
    links = links.filter(l => l.id !== id);
    persist();
    renderLinks();
    document.dispatchEvent(new CustomEvent('linkaura:previewrefresh'));
    showToast('Link removed', 'info');
  }

  function reorderLinks(fromId, toId) {
    const fromIdx = links.findIndex(l => l.id === fromId);
    const toIdx = links.findIndex(l => l.id === toId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = links.splice(fromIdx, 1);
    links.splice(toIdx, 0, moved);
    persist();
    document.dispatchEvent(new CustomEvent('linkaura:previewrefresh'));
  }

  function getLinks() { return links; }

  function setLinks(newLinks) {
    links = newLinks;
    renderLinks();
  }

  /* ─────────────────────────────────────────
     Persistence
  ───────────────────────────────────────── */

  function persist() {
    // Links are saved as part of the active page by main.js via event
    document.dispatchEvent(new CustomEvent('linkaura:linkschanged', { detail: links }));
  }

  function loadLinks(saved = []) {
    links = saved;
    renderLinks();
  }

  /* ─────────────────────────────────────────
     Render Link Cards
  ───────────────────────────────────────── */

  function renderLinks() {
    const list = $('#links-list');
    if (!list) return;

    list.innerHTML = '';

    if (links.length === 0) {
      list.innerHTML = `
        <div class="la-links-empty" style="text-align:center;padding:1.5rem;color:var(--text-muted);font-size:0.8125rem;">
          No links yet — click "Add Link" below ↓
        </div>`;
      return;
    }

    links.forEach(link => {
      const card = buildLinkCard(link);
      list.appendChild(card);
    });
  }

  function buildLinkCard(link) {
    const card = document.createElement('div');
    card.className = 'la-link-card';
    card.dataset.id = link.id;
    card.setAttribute('draggable', 'true');
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', `Link: ${link.title}`);

    card.innerHTML = `
      <span class="la-link-drag-handle" aria-hidden="true" title="Drag to reorder">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="5" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/>
          <circle cx="9" cy="19" r="1" fill="currentColor"/><circle cx="15" cy="5" r="1" fill="currentColor"/>
          <circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="19" r="1" fill="currentColor"/>
        </svg>
      </span>
      <span class="la-link-icon" aria-hidden="true">${link.icon}</span>
      <div class="la-link-info">
        <div class="la-link-title">${escapeHtml(link.title)}</div>
        <div class="la-link-url">${escapeHtml(link.url || 'No URL set')}</div>
      </div>
      <div class="la-link-actions">
        <button class="la-link-action-btn edit-btn" aria-label="Edit ${link.title}" title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="la-link-action-btn delete delete-btn" aria-label="Delete ${link.title}" title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    `;

    // Inline edit form
    const editForm = buildEditForm(link);
    card.appendChild(editForm);

    // Edit button
    card.querySelector('.edit-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const open = editForm.classList.contains('open');
      // Close all other forms first
      $$('.la-link-edit-form.open').forEach(f => f.classList.remove('open'));
      if (!open) editForm.classList.add('open');
    });

    // Delete button
    card.querySelector('.delete-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      removeLink(link.id);
    });

    // Drag & Drop
    bindDragEvents(card, link);

    return card;
  }

  function buildEditForm(link) {
    const form = document.createElement('div');
    form.className = 'la-link-edit-form';
    form.setAttribute('role', 'form');
    form.setAttribute('aria-label', `Edit ${link.title}`);

    form.innerHTML = `
      <input
        type="text"
        class="la-input edit-title"
        value="${escapeHtml(link.title)}"
        placeholder="Link title"
        aria-label="Link title"
      />
      <input
        type="url"
        class="la-input edit-url"
        value="${escapeHtml(link.url)}"
        placeholder="https://your-link.com"
        aria-label="Link URL"
      />
      <div style="display:flex;gap:0.375rem;">
        <input
          type="text"
          class="la-input edit-icon"
          value="${link.icon}"
          placeholder="Emoji icon"
          maxlength="4"
          style="width:60px;"
          aria-label="Link icon emoji"
        />
        <button class="la-btn la-btn--ghost" style="flex:1;font-size:0.75rem;" data-save="${link.id}">Save</button>
        <button class="la-btn la-btn--ghost" style="flex:0;font-size:0.75rem;" data-cancel>Cancel</button>
      </div>
    `;

    const titleInput = form.querySelector('.edit-title');
    const urlInput = form.querySelector('.edit-url');
    const iconInput = form.querySelector('.edit-icon');

    // Auto-detect icon on URL input
    urlInput.addEventListener('input', debounce(() => {
      const detected = detectIcon(urlInput.value, titleInput.value);
      iconInput.value = detected;
    }, 400));

    // Save button
    form.querySelector('[data-save]').addEventListener('click', () => {
      const newTitle = titleInput.value.trim() || 'Untitled';
      const newUrl = ensureHttps(urlInput.value.trim());
      const newIcon = iconInput.value.trim() || detectIcon(newUrl, newTitle);
      updateLink(link.id, { title: newTitle, url: newUrl, icon: newIcon });
      form.classList.remove('open');
    });

    // Cancel button
    form.querySelector('[data-cancel]').addEventListener('click', () => {
      form.classList.remove('open');
    });

    // Save on Enter
    [titleInput, urlInput, iconInput].forEach(input => {
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') form.querySelector('[data-save]').click();
        if (e.key === 'Escape') form.classList.remove('open');
      });
    });

    return form;
  }

  /* ─────────────────────────────────────────
     Drag & Drop
  ───────────────────────────────────────── */

  function bindDragEvents(card, link) {
    card.addEventListener('dragstart', (e) => {
      dragSrc = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', link.id);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      $$('.la-link-card.drag-over').forEach(c => c.classList.remove('drag-over'));
      dragSrc = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragSrc && dragSrc !== card) {
        $$('.la-link-card.drag-over').forEach(c => c.classList.remove('drag-over'));
        card.classList.add('drag-over');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('drag-over');
      if (!dragSrc || dragSrc === card) return;
      const fromId = e.dataTransfer.getData('text/plain');
      reorderLinks(fromId, link.id);
    });
  }

  /* ─────────────────────────────────────────
     Social Links
  ───────────────────────────────────────── */

  const SOCIAL_PLATFORMS = [
    { key: 'instagram',  label: 'Instagram',  icon: '📸', placeholder: '@handle' },
    { key: 'twitter',    label: 'X / Twitter', icon: '𝕏',  placeholder: '@handle' },
    { key: 'youtube',    label: 'YouTube',    icon: '▶️', placeholder: 'channel URL' },
    { key: 'tiktok',     label: 'TikTok',     icon: '🎵', placeholder: '@handle' },
    { key: 'linkedin',   label: 'LinkedIn',   icon: '💼', placeholder: 'profile URL' },
    { key: 'github',     label: 'GitHub',     icon: '🐙', placeholder: '@username' },
    { key: 'spotify',    label: 'Spotify',    icon: '🎧', placeholder: 'artist URL' },
    { key: 'pinterest',  label: 'Pinterest',  icon: '📌', placeholder: '@handle' },
  ];

  let socialData = {};

  function renderSocialLinks(saved = {}) {
    socialData = { ...saved };
    const container = $('#social-links-container');
    if (!container) return;
    container.innerHTML = '';

    SOCIAL_PLATFORMS.forEach(({ key, label, icon, placeholder }) => {
      const wrap = document.createElement('div');
      wrap.className = 'la-social-input-wrap';
      wrap.innerHTML = `
        <span class="la-social-icon" title="${label}">${icon}</span>
        <input
          type="text"
          class="la-social-input"
          data-social="${key}"
          value="${escapeHtml(socialData[key] || '')}"
          placeholder="${placeholder}"
          aria-label="${label} handle or URL"
        />
      `;
      const input = wrap.querySelector('input');
      input.addEventListener('input', debounce(() => {
        socialData[key] = input.value.trim();
        document.dispatchEvent(new CustomEvent('linkaura:socialchanged', { detail: socialData }));
        document.dispatchEvent(new CustomEvent('linkaura:previewrefresh'));
      }, 300));
      container.appendChild(wrap);
    });
  }

  function getSocialData() { return socialData; }
  function setSocialData(data) {
    socialData = data || {};
    renderSocialLinks(socialData);
  }

  /* ─────────────────────────────────────────
     Add Link Button
  ───────────────────────────────────────── */

  function bindAddLink() {
    const btn = $('#add-link-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const link = addLink({ title: 'New Link', url: '', icon: '🔗' });
      // Open the edit form immediately
      setTimeout(() => {
        const card = $(`[data-id="${link.id}"]`);
        if (card) {
          const form = card.querySelector('.la-link-edit-form');
          if (form) {
            form.classList.add('open');
            const titleInput = form.querySelector('.edit-title');
            if (titleInput) {
              titleInput.focus();
              titleInput.select();
            }
          }
          card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          animateClass(card, 'la-fade-in');
        }
      }, 50);
      document.dispatchEvent(new CustomEvent('linkaura:previewrefresh'));
    });
  }

  /* ─────────────────────────────────────────
     Init
  ───────────────────────────────────────── */

  function init() {
    bindAddLink();
    renderSocialLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─────────────────────────────────────────
     Public API
  ───────────────────────────────────────── */
  window.LinkAuraLinks = {
    addLink,
    updateLink,
    removeLink,
    reorderLinks,
    getLinks,
    setLinks,
    loadLinks,
    renderLinks,
    detectIcon,
    getSocialData,
    setSocialData,
    renderSocialLinks,
    SOCIAL_PLATFORMS,
  };
})();
