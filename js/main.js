/**
 * LinkAura — main.js
 * Application orchestrator: view routing, live preview rendering,
 * profile management, pages manager, auto-save, and all UI event binding.
 */

"use strict";

(function () {
  const {
    $,
    $$,
    showToast,
    slugify,
    escapeHtml,
    uid,
    saveStorage,
    loadStorage,
    removeStorage,
    listStorageKeys,
    copyToClipboard,
    fileToBase64,
    debounce,
    timeAgo,
  } = window.LinkAuraUtils;

  /* ─────────────────────────────────────────
     App State
  ───────────────────────────────────────── */

  let activePageId = loadStorage("activePageId", null);
  let currentCardStyle = loadStorage("cardStyle", "glass");
  let currentFont = loadStorage("font", "editorial");
  let isMiniWebsite = false;
  let galleryImages = [];
  let allPages = {};

  const DEFAULT_PAGE = {
    id: null,
    name: "My LinkAura",
    username: "",
    profileName: "",
    bio: "",
    avatar: null,
    socials: {},
    links: [],
    accent: "#c4842a",
    theme: "dark",
    bg: "particles",
    cardStyle: "glass",
    font: "editorial",
    miniWebsite: false,
    aboutText: "",
    gallery: [],
    showContact: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  /* ─────────────────────────────────────────
     Page Data Management
  ───────────────────────────────────────── */

  function loadAllPages() {
    allPages = {};
    const keys = listStorageKeys().filter((k) => k.startsWith("page_"));
    keys.forEach((k) => {
      const page = loadStorage(k);
      if (page?.id) allPages[page.id] = page;
    });
    return allPages;
  }

  function savePage(page) {
    allPages[page.id] = { ...page, updatedAt: Date.now() };
    saveStorage(`page_${page.id}`, allPages[page.id]);
  }

  function deletePage(id) {
    removeStorage(`page_${id}`);
    delete allPages[id];
  }

  function getActivePage() {
    if (!activePageId || !allPages[activePageId]) return null;
    return allPages[activePageId];
  }

  function getCurrentPageData() {
    return {
      id: activePageId || uid("page"),
      name: $("#profile-name")?.value?.trim() || "My LinkAura",
      username: $("#profile-username")?.value?.trim() || "",
      profileName: $("#profile-name")?.value?.trim() || "",
      bio: $("#profile-bio")?.value?.trim() || "",
      avatar: $("#avatar-preview img")?.src || null,
      socials: window.LinkAuraLinks?.getSocialData() || {},
      links: window.LinkAuraLinks?.getLinks() || [],
      accent: window.LinkAuraTheme?.getCurrentAccent() || "#c4842a",
      theme: window.LinkAuraTheme?.getCurrentTheme() || "dark",
      bg: window.LinkAuraTheme?.getCurrentBg() || "particles",
      cardStyle: currentCardStyle,
      font: currentFont,
      miniWebsite: isMiniWebsite,
      aboutText: $("#about-text")?.value?.trim() || "",
      gallery: galleryImages,
      showContact: $("#show-contact")?.checked ?? true,
      createdAt: getActivePage()?.createdAt || Date.now(),
      updatedAt: Date.now(),
    };
  }

  function populateEditorFromPage(page) {
    if (!page) return;
    activePageId = page.id;

    // Profile fields
    const nameEl = $("#profile-name");
    const userEl = $("#profile-username");
    const bioEl = $("#profile-bio");

    if (nameEl) nameEl.value = page.profileName || "";
    if (userEl) userEl.value = page.username || "";
    if (bioEl) {
      bioEl.value = page.bio || "";
      updateBioCount();
    }

    // Avatar
    if (page.avatar) setAvatarPreview(page.avatar);

    // Socials
    window.LinkAuraLinks?.setSocialData(page.socials || {});

    // Links
    window.LinkAuraLinks?.loadLinks(page.links || []);

    // Design
    window.LinkAuraTheme?.applyAccent(page.accent || "#c4842a");
    window.LinkAuraTheme?.applyBackground(page.bg || "particles");
    applyCardStyle(page.cardStyle || "glass");
    applyFont(page.font || "editorial");

    // Mini website
    isMiniWebsite = page.miniWebsite || false;
    const toggle = $("#mini-website-toggle");
    if (toggle) toggle.checked = isMiniWebsite;
    const sections = $("#mini-website-sections");
    if (sections) sections.classList.toggle("hidden", !isMiniWebsite);

    const aboutEl = $("#about-text");
    if (aboutEl) aboutEl.value = page.aboutText || "";

    galleryImages = page.gallery || [];
    renderGalleryPreview();

    const contactEl = $("#show-contact");
    if (contactEl) contactEl.checked = page.showContact ?? true;

    // Update username preview
    updateUsernamePreview();

    // Refresh preview
    refreshPreview();
  }

  /* ─────────────────────────────────────────
     View Routing
  ───────────────────────────────────────── */

  const VIEWS = ["landing", "ai-onboard", "builder", "pages"];

  function navigateTo(viewId) {
    // 1. Synchronously hide ALL views (no RAF, no flash)
    $$(".la-view").forEach((v) => v.classList.remove("active"));

    // 2. Show only the target — CSS !important on .la-view ensures it's hidden
    const target = document.getElementById("view-" + viewId);
    if (target) {
      target.classList.add("active");
      target.scrollTop = 0;
    }

    // 3. Sync header nav pills
    syncNavButtons(viewId);

    // 4. View-specific hooks
    if (viewId === "builder") refreshPreview();
    if (viewId === "pages") renderPagesGrid();
  }

  /* ─────────────────────────────────────────
     Live Preview Renderer
  ───────────────────────────────────────── */

  const refreshPreview = debounce(_refreshPreview, 80);

  function _refreshPreview() {
    const container = $("#live-preview");
    if (!container) return;

    const page = getCurrentPageData();
    const accent = window.LinkAuraTheme?.getCurrentAccent() || "#c4842a";
    const theme = window.LinkAuraTheme?.getCurrentTheme() || "dark";

    // Build CSS vars for preview
    const { hexToRgba } = window.LinkAuraUtils;
    const accentDim = hexToRgba(accent, 0.18);
    const accentGlow = hexToRgba(accent, 0.3);

    // Font family
    const fontMap = {
      editorial: "'Cormorant Garamond', serif",
      modern: "'DM Sans', sans-serif",
      mono: "'DM Mono', monospace",
    };
    const fontFamily = fontMap[page.font] || fontMap.editorial;

    // Preview HTML
    container.innerHTML = buildPreviewHTML(
      page,
      accent,
      accentDim,
      accentGlow,
      fontFamily,
    );

    // Apply preview theme vars
    const previewBg = theme === "dark" ? "#0e0e11" : "#f7f5f2";
    const textColor = theme === "dark" ? "#f0ede8" : "#1a1714";
    const textSecondary =
      theme === "dark" ? "rgba(240,237,232,0.55)" : "rgba(26,23,20,0.55)";
    const glassBg =
      theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.6)";
    const glassBorder =
      theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

    container.style.cssText = `
      --accent: ${accent};
      --accent-dim: ${accentDim};
      --accent-glow: ${accentGlow};
      --text-primary: ${textColor};
      --text-secondary: ${textSecondary};
      --bg-glass: ${glassBg};
      --bg-glass-border: ${glassBorder};
      --preview-bg: ${previewBg};
      --font-display: ${fontFamily};
      background: ${previewBg};
    `;
  }

  function buildPreviewHTML(page, accent, accentDim, accentGlow, fontFamily) {
    const links = page.links || [];
    const socials = page.socials || {};

    // Avatar HTML
    const avatarHtml = page.avatar
      ? `<img src="${page.avatar}" alt="${escapeHtml(page.profileName)}" />`
      : `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
           <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
           <circle cx="12" cy="7" r="4"/>
         </svg>`;

    // Social icons for preview
    const socialEntries = Object.entries(socials).filter(([, v]) => v);
    const socialIcons = {
      instagram: "📸",
      twitter: "𝕏",
      youtube: "▶️",
      tiktok: "🎵",
      linkedin: "💼",
      github: "🐙",
      spotify: "🎧",
      pinterest: "📌",
    };
    const socialsHtml = socialEntries.length
      ? `
      <div class="preview-socials">
        ${socialEntries
          .slice(0, 6)
          .map(
            ([k]) =>
              `<a class="preview-social-btn" href="#" aria-label="${k}">${socialIcons[k] || "🔗"}</a>`,
          )
          .join("")}
      </div>`
      : "";

    // Links HTML
    const linksHtml = links
      .filter((l) => l.active)
      .map(
        (link) => `
      <a class="preview-link-card style-${page.cardStyle}" href="${escapeHtml(link.url)}"
         target="_blank" rel="noopener noreferrer">
        <span class="preview-link-icon">${link.icon}</span>
        <span class="preview-link-title">${escapeHtml(link.title)}</span>
        <span style="margin-left:auto;opacity:0.4;font-size:0.65rem;">↗</span>
      </a>
    `,
      )
      .join("");

    // Mini website sections
    let miniHtml = "";
    if (page.miniWebsite) {
      if (page.aboutText) {
        miniHtml += `
          <div class="preview-section-heading" style="font-family:${fontFamily}">About</div>
          <p class="preview-about">${escapeHtml(page.aboutText)}</p>
        `;
      }
      if (page.gallery?.length) {
        miniHtml += `
          <div class="preview-section-heading" style="font-family:${fontFamily}">Gallery</div>
          <div class="preview-gallery">
            ${page.gallery
              .slice(0, 6)
              .map(
                (src) =>
                  `<img src="${src}" alt="Gallery image" loading="lazy" />`,
              )
              .join("")}
          </div>
        `;
      }
      if (page.showContact) {
        miniHtml += `
          <div class="preview-section-heading" style="font-family:${fontFamily}">Contact</div>
          <div style="width:100%;background:var(--bg-glass);border:1px solid var(--bg-glass-border);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px;">
            <input style="background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 8px;font-size:0.7rem;color:var(--text-primary);width:100%;outline:none;" placeholder="Your name" readonly />
            <input style="background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 8px;font-size:0.7rem;color:var(--text-primary);width:100%;outline:none;" placeholder="Your email" readonly />
            <textarea style="background:transparent;border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:6px 8px;font-size:0.7rem;color:var(--text-primary);width:100%;outline:none;resize:none;" rows="2" placeholder="Your message" readonly></textarea>
            <button style="background:${accent};color:#fff;border:none;border-radius:6px;padding:6px;font-size:0.7rem;cursor:pointer;">Send Message</button>
          </div>
        `;
      }
    }

    return `
      <div class="preview-avatar" style="border-color:${accent};box-shadow:0 0 20px ${accentGlow};">
        ${avatarHtml}
      </div>
      <div class="preview-name" style="font-family:${fontFamily};">
        ${escapeHtml(page.profileName || "Your Name")}
      </div>
      ${page.bio ? `<p class="preview-bio">${escapeHtml(page.bio)}</p>` : ""}
      ${socialsHtml}
      ${
        links.length
          ? `<div class="preview-links">${linksHtml}</div>`
          : `
        <p style="font-size:0.72rem;color:var(--text-secondary);text-align:center;opacity:0.5;margin-top:0.5rem;">
          Add links in the editor →
        </p>`
      }
      ${miniHtml}
      <p style="font-size:0.6rem;color:var(--text-secondary);opacity:0.3;margin-top:1rem;letter-spacing:0.08em;">
        linkaura.io/${escapeHtml(page.username || "you")}
      </p>
    `;
  }

  /* ─────────────────────────────────────────
     Editor Tab System
  ───────────────────────────────────────── */

  function initEditorTabs() {
    const tabs = $$(".la-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const target = tab.dataset.tab;

        tabs.forEach((t) => {
          t.classList.toggle("active", t.dataset.tab === target);
          t.setAttribute("aria-selected", t.dataset.tab === target);
        });

        $$(".la-tab-panel").forEach((panel) => {
          panel.classList.toggle("active", panel.id === `tab-panel-${target}`);
        });
      });
    });
  }

  /* ─────────────────────────────────────────
     Profile Form Bindings
  ───────────────────────────────────────── */

  function bindProfileForm() {
    // Name
    const nameEl = $("#profile-name");
    if (nameEl) {
      nameEl.addEventListener(
        "input",
        debounce(() => {
          updateUsernamePreview();
          refreshPreview();
        }, 150),
      );
    }

    // Username
    const userEl = $("#profile-username");
    if (userEl) {
      userEl.addEventListener("input", () => {
        userEl.value = slugify(userEl.value);
        updateUsernamePreview();
        refreshPreview();
      });
    }

    // Bio
    const bioEl = $("#profile-bio");
    if (bioEl) {
      bioEl.addEventListener("input", () => {
        updateBioCount();
        refreshPreview();
      });
    }

    // Avatar upload
    const avatarZone = $("#avatar-upload-zone");
    const avatarFile = $("#avatar-file");

    if (avatarZone) {
      avatarZone.addEventListener("click", () => avatarFile?.click());
      avatarZone.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") avatarFile?.click();
      });
      // Drag over zone
      avatarZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        avatarZone.style.borderColor = "var(--accent)";
      });
      avatarZone.addEventListener("dragleave", () => {
        avatarZone.style.borderColor = "";
      });
      avatarZone.addEventListener("drop", async (e) => {
        e.preventDefault();
        avatarZone.style.borderColor = "";
        const file = e.dataTransfer.files[0];
        if (file?.type.startsWith("image/")) await handleAvatarFile(file);
      });
    }

    if (avatarFile) {
      avatarFile.addEventListener("change", async () => {
        const file = avatarFile.files[0];
        if (file) await handleAvatarFile(file);
      });
    }
  }

  async function handleAvatarFile(file) {
    try {
      const base64 = await fileToBase64(file);
      setAvatarPreview(base64);
      refreshPreview();
    } catch {
      showToast("Failed to load image", "error");
    }
  }

  function setAvatarPreview(src) {
    const preview = $("#avatar-preview");
    if (!preview) return;
    preview.innerHTML = `<img src="${src}" alt="Profile photo" />`;
  }

  function updateBioCount() {
    const bioEl = $("#profile-bio");
    const countEl = $("#bio-count");
    if (bioEl && countEl) countEl.textContent = bioEl.value.length;
  }

  function updateUsernamePreview() {
    const nameEl = $("#profile-name");
    const userEl = $("#profile-username");
    const preview = $("#username-preview");
    if (!preview) return;
    const val = userEl?.value || slugify(nameEl?.value || "") || "you";
    preview.textContent = val || "you";
  }

  /* ─────────────────────────────────────────
     Card Style
  ───────────────────────────────────────── */

  function applyCardStyle(style) {
    currentCardStyle = style;
    saveStorage("cardStyle", style);
    $$(".la-card-style-btn").forEach((btn) => {
      const active = btn.dataset.style === style;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active);
    });
    refreshPreview();
  }

  function bindCardStyleButtons() {
    $$(".la-card-style-btn").forEach((btn) => {
      btn.addEventListener("click", () => applyCardStyle(btn.dataset.style));
    });
  }

  /* ─────────────────────────────────────────
     Font Style
  ───────────────────────────────────────── */

  function applyFont(font) {
    currentFont = font;
    saveStorage("font", font);
    $$(".la-font-btn").forEach((btn) => {
      const active = btn.dataset.font === font;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", active);
    });
    refreshPreview();
  }

  function bindFontButtons() {
    $$(".la-font-btn").forEach((btn) => {
      btn.addEventListener("click", () => applyFont(btn.dataset.font));
    });
  }

  /* ─────────────────────────────────────────
     Mini Website Toggle
  ───────────────────────────────────────── */

  function bindMiniWebsiteToggle() {
    const toggle = $("#mini-website-toggle");
    const sections = $("#mini-website-sections");
    if (!toggle || !sections) return;

    toggle.addEventListener("change", () => {
      isMiniWebsite = toggle.checked;
      sections.classList.toggle("hidden", !isMiniWebsite);
      refreshPreview();
      if (isMiniWebsite) {
        showToast("Mini Website Mode enabled ✦", "success");
      }
    });

    // About text
    const aboutEl = $("#about-text");
    if (aboutEl)
      aboutEl.addEventListener("input", debounce(refreshPreview, 200));

    // Show contact toggle
    const contactEl = $("#show-contact");
    if (contactEl) contactEl.addEventListener("change", refreshPreview);
  }

  /* ─────────────────────────────────────────
     Gallery
  ───────────────────────────────────────── */

  function bindGallery() {
    const zone = $("#gallery-drop-zone");
    const input = $("#gallery-files");
    if (!zone || !input) return;

    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") input.click();
    });

    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.style.borderColor = "var(--accent)";
    });
    zone.addEventListener("dragleave", () => {
      zone.style.borderColor = "";
    });
    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      zone.style.borderColor = "";
      const files = [...e.dataTransfer.files].filter((f) =>
        f.type.startsWith("image/"),
      );
      await handleGalleryFiles(files);
    });

    input.addEventListener("change", async () => {
      const files = [...input.files];
      await handleGalleryFiles(files);
    });
  }

  async function handleGalleryFiles(files) {
    const newImages = await Promise.all(
      files.slice(0, 6 - galleryImages.length).map(fileToBase64),
    );
    galleryImages = [...galleryImages, ...newImages].slice(0, 6);
    renderGalleryPreview();
    refreshPreview();
  }

  function renderGalleryPreview() {
    const container = $("#gallery-preview");
    if (!container) return;
    container.innerHTML = galleryImages
      .map(
        (src, i) => `
      <div class="la-gallery-thumb">
        <img src="${src}" alt="Gallery ${i + 1}" />
      </div>
    `,
      )
      .join("");
  }

  /* ─────────────────────────────────────────
     Device Preview Toggle
  ───────────────────────────────────────── */

  function bindDeviceToggle() {
    $$(".la-device-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const device = btn.dataset.device;
        $$(".la-device-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.device === device);
          b.setAttribute("aria-pressed", b.dataset.device === device);
        });
        const frame = $(".la-phone-frame");
        if (frame) frame.classList.toggle("desktop-mode", device === "desktop");
      });
    });
  }

  /* ─────────────────────────────────────────
     Save & Share / Export
  ─────────────────────────────────────────
   SOLUTION: Since this is 100% client-side with no backend,
   "sharing" works by exporting a self-contained HTML file the
   user can host anywhere (GitHub Pages, Netlify Drop, etc.)
   OR open locally in any browser — no server needed.
  ───────────────────────────────────────── */

  function bindSaveShare() {
    const saveBtn = $("#save-page-btn");
    const copyBtn = $("#copy-link-btn");

    if (saveBtn) {
      saveBtn.addEventListener("click", () => {
        const page = getCurrentPageData();
        if (!page.id) page.id = uid("page");
        activePageId = page.id;
        saveStorage("activePageId", activePageId);
        savePage(page);
        showToast("Page saved ✦", "success");
        animateSaveBtn(saveBtn);
      });
    }

    // "Copy Link" button now exports a standalone HTML file
    if (copyBtn) {
      copyBtn.addEventListener("click", () => {
        const page = getCurrentPageData();
        exportPageAsHtml(page);
      });
    }
  }

  /**
   * Generate and download a self-contained HTML file for the page.
   * The exported file works offline, can be hosted on any static host,
   * or shared directly — no backend or account needed.
   */
  /**
   * Generate the full standalone HTML string for a page.
   * Used by both export (download) and preview (new tab).
   */
  function generatePageHtml(page) {
    return _buildPageHtml(page);
  }

  function _buildPageHtml(page) {
    const accent = page.accent || "#c4842a";
    const { hexToRgba } = window.LinkAuraUtils;
    const accentDim = hexToRgba(accent, 0.18);
    const accentGlow = hexToRgba(accent, 0.32);
    const isDark = (page.theme || "dark") === "dark";

    const bgBase = isDark ? "#0c0c0e" : "#f7f5f2";
    const bgGlass = isDark
      ? "rgba(255,255,255,0.06)"
      : "rgba(255,255,255,0.65)";
    const bgBorder = isDark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.09)";
    const textPrim = isDark ? "#f0ede8" : "#1a1714";
    const textSec = isDark ? "rgba(240,237,232,0.55)" : "rgba(26,23,20,0.55)";
    const textMuted = isDark ? "rgba(240,237,232,0.3)" : "rgba(26,23,20,0.3)";

    const fontMap = {
      editorial: "'Cormorant Garamond', serif",
      modern: "'DM Sans', sans-serif",
      mono: "'DM Mono', monospace",
    };
    const fontDisplay = fontMap[page.font] || fontMap.editorial;
    const fontBody = "'DM Sans', sans-serif";

    const socialIcons = {
      instagram: "📸",
      twitter: "𝕏",
      youtube: "▶️",
      tiktok: "🎵",
      linkedin: "💼",
      github: "🐙",
      spotify: "🎧",
      pinterest: "📌",
    };
    const socialLinks = Object.entries(page.socials || {})
      .filter(([, v]) => v)
      .map(([k, v]) => {
        const handle = v.startsWith("http")
          ? v
          : `https://${k}.com/${v.replace("@", "")}`;
        return `<a href="${handle}" target="_blank" rel="noopener noreferrer" class="social-btn" aria-label="${k}">
          ${socialIcons[k] || "🔗"}
        </a>`;
      })
      .join("");

    const linkCards = (page.links || [])
      .filter((l) => l.active)
      .map((l) => {
        let cardStyle = "";
        if (page.cardStyle === "solid") {
          cardStyle = `background:${accent};color:#fff;border:none;`;
        } else if (page.cardStyle === "outline") {
          cardStyle = `background:transparent;border:1.5px solid ${accent};color:${accent};`;
        } else if (page.cardStyle === "soft") {
          cardStyle = `background:${accentDim};border:1px solid ${accentDim};color:${accent};`;
        } else {
          cardStyle = `background:${bgGlass};border:1px solid ${bgBorder};backdrop-filter:blur(12px);`;
        }
        const url = l.url || "#";
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="link-card" style="${cardStyle}">
        <span class="link-icon">${l.icon || "🔗"}</span>
        <span class="link-title">${l.title || ""}</span>
        <span class="link-arrow">↗</span>
      </a>`;
      })
      .join("");

    const avatarHtml = page.avatar
      ? `<img src="${page.avatar}" alt="${page.profileName || ""}" class="avatar-img" />`
      : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${textMuted}" stroke-width="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

    // Mini website sections
    let miniSections = "";
    if (page.miniWebsite) {
      if (page.aboutText) {
        miniSections += `
          <div class="section-heading">About</div>
          <p class="about-text">${page.aboutText.replace(/\n/g, "<br>")}</p>`;
      }
      if (page.gallery?.length) {
        const imgs = page.gallery
          .slice(0, 6)
          .map((src) => `<img src="${src}" alt="" class="gallery-img" />`)
          .join("");
        miniSections += `
          <div class="section-heading">Gallery</div>
          <div class="gallery-grid">${imgs}</div>`;
      }
      if (page.showContact) {
        miniSections += `
          <div class="section-heading">Contact</div>
          <form class="contact-form" onsubmit="handleContact(event)">
            <input type="text" placeholder="Your name" required />
            <input type="email" placeholder="Your email" required />
            <textarea rows="3" placeholder="Your message" required></textarea>
            <button type="submit">Send Message</button>
          </form>
          <p id="contact-sent" style="display:none;color:${accent};text-align:center;font-size:0.85rem;margin-top:0.5rem;">
            ✓ Message sent! (demo — connect a form service to receive messages)
          </p>`;
      }
    }

    // Particle JS for exported page
    const particleJs =
      page.bg === "particles"
        ? `
    <canvas id="bg-canvas"></canvas>
    <script>
      (function(){
        const c = document.getElementById('bg-canvas');
        const ctx = c.getContext('2d');
        const accent = '${accent}';
        function hexToRgba(h, a) {
          const n = parseInt(h.replace('#',''),16);
          return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';
        }
        let pts = [];
        function resize(){ c.width=innerWidth; c.height=innerHeight; }
        resize();
        window.onresize = resize;
        for(let i=0;i<45;i++) pts.push({
          x:Math.random()*innerWidth, y:Math.random()*innerHeight,
          sx:(Math.random()-.5)*.25, sy:-(Math.random()*.35+.08),
          r:Math.random()*1.6+.3, o:Math.random()*.4+.05,
          t:0, ts:Math.random()*.012+.004, to:Math.random()*Math.PI*2
        });
        function loop(){
          ctx.clearRect(0,0,c.width,c.height);
          pts.forEach(p=>{
            p.x+=p.sx; p.y+=p.sy; p.t++;
            if(p.y<-10||p.t>600){p.y=c.height+10;p.x=Math.random()*c.width;p.t=0;}
            const tw=Math.sin(p.t*p.ts+p.to);
            ctx.globalAlpha=Math.max(0,p.o*(0.6+0.4*tw));
            ctx.fillStyle=hexToRgba(accent,1);
            ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
          });
          ctx.globalAlpha=1;
          requestAnimationFrame(loop);
        }
        loop();
      })();
    <\/script>`
        : "";

    const bgStyle =
      page.bg === "gradient"
        ? `background: radial-gradient(ellipse at 20% 50%, ${accentDim} 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, ${hexToRgba(accent, 0.04)} 0%, transparent 40%), ${bgBase};`
        : page.bg === "mesh"
          ? `background: linear-gradient(135deg, ${accentDim} 0%, transparent 50%), linear-gradient(225deg, ${hexToRgba(accent, 0.04)} 0%, transparent 50%), ${bgBase};`
          : `background:${bgBase};`;

    const username = page.username || page.id || "me";
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.profileName || "My LinkAura"}</title>
  <meta name="description" content="${(page.bio || "").slice(0, 150)}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      font-family: ${fontBody};
      color: ${textPrim};
      min-height: 100dvh;
      ${bgStyle}
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1.25rem 4rem;
      position: relative;
      overflow-x: hidden;
    }
    #bg-canvas {
      position: fixed; inset: 0;
      width: 100%; height: 100%;
      pointer-events: none; z-index: 0; opacity: 0.55;
    }
    .page-wrap {
      position: relative; z-index: 1;
      width: 100%; max-width: 480px;
      display: flex; flex-direction: column;
      align-items: center; gap: 1rem;
    }
    /* Avatar */
    .avatar {
      width: 88px; height: 88px; border-radius: 50%;
      border: 2px solid ${accent};
      box-shadow: 0 0 24px ${accentGlow};
      background: ${bgGlass};
      display: flex; align-items: center; justify-content: center;
      overflow: hidden; flex-shrink: 0;
    }
    .avatar-img { width: 100%; height: 100%; object-fit: cover; }
    /* Name */
    .display-name {
      font-family: ${fontDisplay};
      font-size: clamp(1.5rem, 5vw, 2rem);
      font-weight: 500;
      text-align: center;
      line-height: 1.2;
      color: ${textPrim};
    }
    /* Bio */
    .bio {
      font-size: 0.875rem;
      color: ${textSec};
      text-align: center;
      line-height: 1.65;
      max-width: 360px;
    }
    /* Socials */
    .socials {
      display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;
    }
    .social-btn {
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      background: ${bgGlass}; border: 1px solid ${bgBorder};
      border-radius: 50%; font-size: 1rem;
      text-decoration: none; transition: transform 0.2s ease;
    }
    .social-btn:hover { transform: scale(1.12); }
    /* Links */
    .links { width: 100%; display: flex; flex-direction: column; gap: 0.625rem; }
    .link-card {
      width: 100%; display: flex; align-items: center; gap: 0.75rem;
      padding: 0.875rem 1.125rem; border-radius: 14px;
      text-decoration: none; font-size: 0.875rem; font-weight: 500;
      color: ${textPrim}; transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: pointer;
    }
    .link-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
    .link-icon { font-size: 1.1rem; width: 30px; text-align: center; flex-shrink: 0; }
    .link-title { flex: 1; }
    .link-arrow { opacity: 0.35; font-size: 0.75rem; margin-left: auto; }
    /* Mini website sections */
    .section-heading {
      font-family: ${fontDisplay};
      font-size: 0.8rem; font-weight: 500;
      color: ${accent}; letter-spacing: 0.1em;
      text-transform: uppercase;
      align-self: flex-start; width: 100%;
      margin-top: 0.5rem;
    }
    .about-text {
      font-size: 0.875rem; color: ${textSec}; line-height: 1.65;
      text-align: center; max-width: 400px;
    }
    .gallery-grid {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 0.375rem; width: 100%;
    }
    .gallery-img {
      aspect-ratio: 1; object-fit: cover;
      border-radius: 8px; width: 100%;
    }
    /* Contact form */
    .contact-form {
      width: 100%; display: flex; flex-direction: column; gap: 0.5rem;
      background: ${bgGlass}; border: 1px solid ${bgBorder};
      border-radius: 14px; padding: 1.125rem;
    }
    .contact-form input,
    .contact-form textarea {
      background: transparent;
      border: 1px solid ${bgBorder};
      border-radius: 8px; padding: 0.6rem 0.75rem;
      font-size: 0.8rem; color: ${textPrim};
      font-family: ${fontBody}; width: 100%; outline: none;
      transition: border-color 0.15s ease;
    }
    .contact-form input:focus,
    .contact-form textarea:focus { border-color: ${accent}; }
    .contact-form textarea { resize: vertical; min-height: 70px; }
    .contact-form button {
      background: ${accent}; color: #fff; border: none;
      border-radius: 8px; padding: 0.65rem;
      font-size: 0.85rem; font-weight: 500; font-family: ${fontBody};
      cursor: pointer; transition: opacity 0.15s ease;
    }
    .contact-form button:hover { opacity: 0.88; }
    /* Footer */
    .page-footer {
      font-size: 0.65rem; color: ${textMuted};
      letter-spacing: 0.08em; margin-top: 1.5rem;
      text-align: center;
    }
    .page-footer a { color: ${accent}; text-decoration: none; }
    /* Smooth entrance */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(14px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .page-wrap > * {
      animation: fadeUp 0.5s ease forwards;
      opacity: 0;
    }
    .page-wrap > *:nth-child(1) { animation-delay: 0.05s; }
    .page-wrap > *:nth-child(2) { animation-delay: 0.1s; }
    .page-wrap > *:nth-child(3) { animation-delay: 0.15s; }
    .page-wrap > *:nth-child(4) { animation-delay: 0.2s; }
    .page-wrap > *:nth-child(5) { animation-delay: 0.25s; }
    .page-wrap > *:nth-child(n+6) { animation-delay: 0.3s; }
  </style>
</head>
<body>
  ${particleJs}
  <div class="page-wrap">
    <div class="avatar">${avatarHtml}</div>
    <h1 class="display-name">${page.profileName || "Your Name"}</h1>
    ${page.bio ? `<p class="bio">${page.bio.replace(/\n/g, "<br>")}</p>` : ""}
    ${socialLinks ? `<div class="socials">${socialLinks}</div>` : ""}
    ${linkCards ? `<div class="links">${linkCards}</div>` : ""}
    ${miniSections}
    <p class="page-footer">
      Made with <a href="https://github.com/linkaura" target="_blank" rel="noopener">LinkAura</a>
    </p>
  </div>
  <script>
    function handleContact(e) {
      e.preventDefault();
      document.getElementById('contact-sent').style.display = 'block';
      e.target.reset();
    }
  <\/script>
</body>
</html>`;

    return html;
  }

  function exportPageAsHtml(page) {
    const html = _buildPageHtml(page);
    const username = page.username || page.id || "me";

    // Trigger download
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}-linkaura.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast(
      "✦ HTML file downloaded! Open it in any browser or host it free on Netlify / GitHub Pages.",
      "success",
      5500,
    );
  }

  function animateSaveBtn(btn) {
    const original = btn.innerHTML;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
    btn.style.background = "#4caf7d";
    setTimeout(() => {
      btn.innerHTML = original;
      btn.style.background = "";
    }, 2000);
  }

  /* ─────────────────────────────────────────
     Pages Manager
  ───────────────────────────────────────── */

  function renderPagesGrid() {
    loadAllPages();
    const grid = $("#pages-grid");
    if (!grid) return;

    const pages = Object.values(allPages);

    if (!pages.length) {
      grid.innerHTML = `
        <div class="la-empty-state">
          <div class="la-empty-state__icon">✦</div>
          <h3 class="la-empty-state__title">No pages yet</h3>
          <p class="la-empty-state__desc">Create your first LinkAura page to get started.</p>
          <button class="la-btn la-btn--primary" id="empty-create-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Create My First Page
          </button>
        </div>
      `;
      $("#empty-create-btn")?.addEventListener("click", () => startNewPage());
      return;
    }

    grid.innerHTML = "";
    pages
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .forEach((page) => {
        const card = buildPageCard(page);
        grid.appendChild(card);
      });
  }

  function buildPageCard(page) {
    const card = document.createElement("div");
    card.className = "la-page-card";
    card.setAttribute("role", "article");

    // Mini preview thumbnail
    const accent = page.accent || "#c4842a";
    const { hexToRgba } = window.LinkAuraUtils;

    card.innerHTML = `
      <div class="la-page-card__thumb" style="background:linear-gradient(135deg,${hexToRgba(accent, 0.15)} 0%, var(--bg-elevated) 100%);">
        <div style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:1rem;width:100%;">
          <div style="width:36px;height:36px;border-radius:50%;background:${hexToRgba(accent, 0.3)};border:2px solid ${accent};display:flex;align-items:center;justify-content:center;font-size:0.8rem;overflow:hidden;">
            ${page.avatar ? `<img src="${page.avatar}" style="width:100%;height:100%;object-fit:cover;" alt="" />` : "👤"}
          </div>
          <div style="font-size:0.7rem;font-weight:600;color:var(--text-primary);text-align:center;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${escapeHtml(page.profileName || page.name)}
          </div>
          ${(page.links || [])
            .slice(0, 3)
            .map(
              (l) => `
            <div style="width:90%;height:8px;background:${hexToRgba(accent, 0.2)};border:1px solid ${hexToRgba(accent, 0.3)};border-radius:4px;"></div>
          `,
            )
            .join("")}
        </div>
      </div>
      <div class="la-page-card__info">
        <div class="la-page-card__name">${escapeHtml(page.name || "Untitled")}</div>
        <div class="la-page-card__meta">
          linkaura.io/${page.username || page.id} · ${timeAgo(page.updatedAt)}
        </div>
      </div>
      <div class="la-page-card__actions">
        <button class="la-btn la-btn--primary" style="font-size:0.75rem;padding:0.4rem 0.75rem;" data-edit="${page.id}">
          Edit
        </button>
        <button class="la-btn la-btn--ghost" style="font-size:0.75rem;padding:0.4rem 0.75rem;" data-preview="${page.id}" title="Preview in new tab">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Preview
        </button>
        <button class="la-btn la-btn--ghost" style="font-size:0.75rem;padding:0.4rem 0.75rem;" data-export="${page.id}" title="Download HTML file">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export
        </button>
        <button class="la-btn la-btn--ghost" style="font-size:0.75rem;padding:0.4rem 0.75rem;color:#e05252;" data-delete="${page.id}">
          Delete
        </button>
      </div>
    `;

    card.querySelector("[data-edit]")?.addEventListener("click", () => {
      editPage(page.id);
    });
    card.querySelector("[data-preview]")?.addEventListener("click", () => {
      openFullPreview(page);
    });
    card.querySelector("[data-export]")?.addEventListener("click", () => {
      exportPageAsHtml(page);
    });
    card.querySelector("[data-delete]")?.addEventListener("click", () => {
      if (
        confirm(
          'Delete "' + (page.name || "this page") + '"? This cannot be undone.',
        )
      ) {
        deletePage(page.id);
        renderPagesGrid();
        showToast("Page deleted", "info");
      }
    });

    return card;
  }

  function editPage(id) {
    loadAllPages();
    const page = allPages[id];
    if (!page) return;
    activePageId = id;
    saveStorage("activePageId", id);
    populateEditorFromPage(page);
    navigateTo("builder");
  }

  function duplicatePage(id) {
    loadAllPages();
    const page = allPages[id];
    if (!page) return;
    const newId = uid("page");
    const copy = {
      ...page,
      id: newId,
      name: page.name + " (copy)",
      username: (page.username || "") + "-copy",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    savePage(copy);
    renderPagesGrid();
    showToast("Page duplicated ✦", "success");
  }

  function startNewPage() {
    activePageId = uid("page");
    saveStorage("activePageId", activePageId);
    populateEditorFromPage({ ...DEFAULT_PAGE, id: activePageId });
    navigateTo("builder");
  }

  /* ─────────────────────────────────────────
     AI Onboarding Flow
  ───────────────────────────────────────── */

  function bindAiOnboarding() {
    // CTA buttons on landing
    const ctaBuilder = $("#cta-builder");
    const ctaAi = $("#cta-ai");

    if (ctaBuilder) {
      ctaBuilder.addEventListener("click", () => {
        startNewPage();
      });
    }

    if (ctaAi) {
      ctaAi.addEventListener("click", () => {
        navigateTo("ai-onboard");
      });
    }

    // AI Generate button
    const generateBtn = $("#ai-generate-btn");
    if (generateBtn) {
      generateBtn.addEventListener("click", async () => {
        const name = $("#ai-name")?.value?.trim() || "";
        const niche = $("#ai-niche")?.value?.trim() || "";
        const vibe = $("#ai-vibe")?.value?.trim() || "";

        if (!name && !niche) {
          showToast("Please enter your name or niche first", "error");
          return;
        }

        // Show loader
        const label = generateBtn.querySelector(".btn-label");
        const loader = generateBtn.querySelector(".btn-loader");
        if (label) label.hidden = true;
        if (loader) loader.hidden = false;
        generateBtn.disabled = true;

        try {
          const result = await window.LinkAuraAI.generatePage(
            name,
            niche,
            vibe,
          );

          // Apply to new page
          activePageId = uid("page");
          saveStorage("activePageId", activePageId);

          // Set profile
          const nameEl = $("#profile-name");
          const bioEl = $("#profile-bio");
          if (nameEl) {
            nameEl.value = name;
          }
          if (bioEl) {
            bioEl.value = result.bio;
            updateBioCount();
          }

          // Apply template
          window.LinkAuraAI.applyTemplate(result.nicheId);

          // Navigate to builder
          navigateTo("builder");
          showToast(
            `✨ Your ${result.template.name} page is ready!`,
            "success",
          );
        } catch (err) {
          showToast("Something went wrong. Please try again.", "error");
        } finally {
          if (label) label.hidden = false;
          if (loader) loader.hidden = true;
          generateBtn.disabled = false;
        }
      });
    }

    // Skip button
    const skipBtn = $("#ai-skip-btn");
    if (skipBtn) {
      skipBtn.addEventListener("click", () => startNewPage());
    }
  }

  /* ─────────────────────────────────────────
     Header View Switcher
  ───────────────────────────────────────── */

  function bindHeaderNav() {
    // Builder button
    const builderBtn = $("#tab-builder");
    if (builderBtn) {
      builderBtn.addEventListener("click", () => {
        if (!activePageId) startNewPage();
        else navigateTo("builder");
        syncNavButtons("builder");
      });
    }

    // Preview button — opens full-screen preview in a new tab
    const previewBtn = $("#tab-preview");
    if (previewBtn) {
      previewBtn.addEventListener("click", () => {
        const page = getCurrentPageData();
        openFullPreview(page);
      });
    }

    // Pages button
    const pagesBtn = $("#tab-pages");
    if (pagesBtn) {
      pagesBtn.addEventListener("click", () => {
        navigateTo("pages");
        syncNavButtons("pages");
      });
    }

    // New page button in pages view
    const newPageBtn = $("#new-page-btn");
    if (newPageBtn) newPageBtn.addEventListener("click", startNewPage);
  }

  /** Highlight the correct nav pill by matching tab-{viewId} id */
  function syncNavButtons(activeView) {
    ["builder", "pages", "preview"].forEach((view) => {
      const btn = $(`#tab-${view}`);
      if (btn) {
        const isActive = view === activeView;
        btn.classList.toggle("active", isActive);
      }
    });
  }

  /**
   * Open the current page as a full-screen preview in a new browser tab.
   * This is the real purpose of Preview — see exactly what visitors will see.
   */
  function openFullPreview(page) {
    // Reuse the HTML exporter but open in a new tab instead of downloading
    const html = generatePageHtml(page);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener");
    // Revoke after tab loads
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    if (!win) {
      showToast("Pop-up blocked — please allow pop-ups for preview", "error");
    } else {
      showToast("✦ Preview opened in new tab", "success");
    }
  }

  /* ─────────────────────────────────────────
     Custom Events
  ───────────────────────────────────────── */

  function bindCustomEvents() {
    // Preview refresh from other modules
    document.addEventListener("linkaura:previewrefresh", refreshPreview);

    // Links changed
    document.addEventListener("linkaura:linkschanged", (e) => {
      // Auto-save silently
      const page = getCurrentPageData();
      if (activePageId) savePage(page);
    });

    // Navigation from template cards
    document.addEventListener("linkaura:navigate", (e) => {
      const view = e.detail;
      if (view === "builder") {
        if (!activePageId) startNewPage();
        else navigateTo("builder");
      } else {
        navigateTo(view);
      }
    });
  }

  /* ─────────────────────────────────────────
     Auto-save (every 30s)
  ───────────────────────────────────────── */

  function startAutoSave() {
    setInterval(() => {
      if (activePageId) {
        const page = getCurrentPageData();
        savePage(page);
      }
    }, 30000);
  }

  /* ─────────────────────────────────────────
     Restore Last Session
  ───────────────────────────────────────── */

  function restoreSession() {
    loadAllPages();
    const savedId = loadStorage("activePageId");
    if (savedId && allPages[savedId]) {
      activePageId = savedId;
      // Don't auto-navigate; let user start from landing
    }
  }

  /* ─────────────────────────────────────────
     Keyboard Shortcuts
  ───────────────────────────────────────── */

  function bindKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Cmd/Ctrl + S → Save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        const view = document.querySelector(".la-view.active")?.id;
        if (view === "view-builder") {
          $("#save-page-btn")?.click();
        }
      }
    });
  }

  /* ─────────────────────────────────────────
     Entry Point
  ───────────────────────────────────────── */

  function init() {
    restoreSession();
    initEditorTabs();
    bindProfileForm();
    bindCardStyleButtons();
    bindFontButtons();
    bindMiniWebsiteToggle();
    bindGallery();
    bindDeviceToggle();
    bindSaveShare();
    bindAiOnboarding();
    bindHeaderNav();
    bindCustomEvents();
    bindKeyboardShortcuts();
    startAutoSave();

    // Set initial card style & font UI state
    applyCardStyle(currentCardStyle);
    applyFont(currentFont);

    // Initialize bio counter
    updateBioCount();
    updateUsernamePreview();

    // Show landing view by default
    navigateTo("landing");

    // If returning user with a saved page, hint them
    const pages = Object.values(allPages);
    if (pages.length > 0) {
      setTimeout(() => {
        showToast(
          `Welcome back! You have ${pages.length} saved page${pages.length > 1 ? "s" : ""}.`,
          "info",
          4000,
        );
      }, 800);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Expose for debugging
  window.LinkAuraApp = {
    navigateTo,
    getCurrentPageData,
    refreshPreview,
    startNewPage,
    allPages,
  };
})();
