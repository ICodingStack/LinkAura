/**
 * LinkAura — publish.js
 *
 * REAL SHAREABLE LINKS — How it works:
 * ─────────────────────────────────────
 * 1. User clicks "Publish"
 * 2. We generate a self-contained HTML string for their page
 * 3. We upload it to JSONbin.io (free, no account needed for reading)
 *    → Returns a unique bin ID  e.g.  6634f2abc1234567890abcde
 * 4. We wrap that into a viewer URL:
 *    https://icodingstack.github.io/LinkAura/view.html?id=6634f2abc...
 *    (or any static host where view.html is deployed)
 * 5. view.html fetches the bin, renders the HTML → real public page
 *
 * Fallback: If JSONbin fails → download HTML file (always works).
 *
 * JSONbin free tier:
 *  - 10,000 reads/month per bin
 *  - Bins are public by default (perfect for sharing)
 *  - No auth needed to READ a bin
 *  - Only needs an API key to CREATE bins
 *
 * We use a shared API key embedded here (read: this is fine for a
 * free open-source tool — rate limits are generous, and bins are public).
 * Users can replace JSONBIN_API_KEY with their own from jsonbin.io
 */

"use strict";

(function () {
  const { $, showToast, copyToClipboard } = window.LinkAuraUtils;

  /* ─────────────────────────────────────────
     Configuration
  ───────────────────────────────────────── */

  // JSONbin.io public API key — free tier, 10k reads/bin/month
  // Replace with your own at https://jsonbin.io/api-keys
  const JSONBIN_API_KEY =
    "$2a$10$pKG2tcn1LfncZ86Jh/gpnONdFai68ULxXRpkRjzKo0xKv1HcY511m";

  // Base URL for the viewer page
  // Change this to your own GitHub Pages / Netlify / Vercel URL
  const VIEWER_BASE = "https://icodingstack.github.io/LinkAura/view.html";

  // Fallback: local viewer (works when running via localhost)
  const LOCAL_VIEWER =
    window.location.href.replace("index.html", "").replace(/\/$/, "") +
    "/view.html";

  /* ─────────────────────────────────────────
     Modal State
  ───────────────────────────────────────── */

  function showModal() {
    const m = $("#share-modal");
    if (m) m.removeAttribute("hidden");
  }
  function closeModal() {
    const m = $("#share-modal");
    if (m) m.setAttribute("hidden", "");
  }

  function showState(id) {
    ["share-publishing", "share-success", "share-error"].forEach((s) => {
      const el = $("#" + s);
      if (el) el.hidden = s !== id;
    });
  }

  /* ─────────────────────────────────────────
     Publish Flow
  ───────────────────────────────────────── */

  async function publish(page) {
    showModal();
    showState("share-publishing");

    try {
      // 1. Generate the complete page HTML
      const html = window.LinkAuraApp?.generatePageHtml
        ? window.LinkAuraApp.generatePageHtml(page)
        : window.LinkAuraBuildHtml(page);

      // 2. Try to upload to JSONbin
      let shareUrl;
      try {
        shareUrl = await uploadToJsonbin({
          html,
          meta: {
            name: page.profileName || page.name || "LinkAura Page",
            username: page.username || "",
            createdAt: Date.now(),
          },
        });
      } catch (uploadErr) {
        console.warn(
          "[LinkAura] JSONbin upload failed, using local blob:",
          uploadErr,
        );
        // Graceful fallback: open as blob URL + prompt download
        shareUrl = null;
      }

      if (shareUrl) {
        showSuccessState(shareUrl, page, html);
      } else {
        // Fallback: download the HTML file
        triggerDownload(html, page.username || "linkaura-page");
        showState("share-error");
        const msg = $("#share-error-msg");
        if (msg)
          msg.textContent =
            "Could not upload to cloud. Your HTML file was downloaded instead — you can host it yourself.";
        const offlineBtn = $("#share-offline-btn");
        if (offlineBtn) offlineBtn.style.display = "none";
      }
    } catch (err) {
      console.error("[LinkAura] Publish error:", err);
      showState("share-error");
      const msg = $("#share-error-msg");
      if (msg)
        msg.textContent =
          err.message || "Something went wrong. Please try again.";
    }
  }

  /* ─────────────────────────────────────────
     JSONbin.io Upload
  ───────────────────────────────────────── */

  async function uploadToJsonbin(data) {
    // Check if API key is still the placeholder
    if (JSONBIN_API_KEY.includes("placeholder")) {
      throw new Error(
        "JSONbin API key not configured. See js/publish.js to set yours.",
      );
    }

    const response = await fetch("https://api.jsonbin.io/v3/b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_API_KEY,
        "X-Bin-Private": "false", // Public bin — anyone can read
        "X-Bin-Name": data.meta.name,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Upload failed (HTTP ${response.status})`);
    }

    const result = await response.json();
    const binId = result.metadata?.id;
    if (!binId) throw new Error("No bin ID returned from JSONbin");

    // Build the viewer URL
    const viewerUrl = `${VIEWER_BASE}?id=${binId}`;
    return viewerUrl;
  }

  /* ─────────────────────────────────────────
     Success State — link, QR, social share
  ───────────────────────────────────────── */

  function showSuccessState(url, page, html) {
    showState("share-success");

    // Display link
    const linkEl = $("#share-link-display");
    if (linkEl) {
      linkEl.textContent = url.replace("https://", "");
      linkEl.href = url;
    }

    // Copy button
    const copyBtn = $("#copy-share-link");
    if (copyBtn) {
      copyBtn.onclick = async () => {
        const ok = await copyToClipboard(url);
        if (ok) {
          copyBtn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
          showToast("Link copied! ✦", "success");
          setTimeout(() => {
            copyBtn.innerHTML =
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
          }, 2500);
        }
      };
    }

    // QR Code
    generateQR(url);

    // Social share buttons
    const text = encodeURIComponent(`Check out my LinkAura page: ${url}`);
    const urlEnc = encodeURIComponent(url);

    const twitterBtn = $("#share-twitter");
    if (twitterBtn)
      twitterBtn.onclick = () =>
        window.open(
          `https://twitter.com/intent/tweet?text=${text}`,
          "_blank",
          "noopener",
        );

    const waBtn = $("#share-whatsapp");
    if (waBtn)
      waBtn.onclick = () =>
        window.open(`https://wa.me/?text=${text}`, "_blank", "noopener");

    const igBtn = $("#share-instagram");
    if (igBtn)
      igBtn.onclick = async () => {
        await copyToClipboard(url);
        showToast(
          "Link copied — paste it in your Instagram bio! 📸",
          "success",
          4000,
        );
      };

    // Also export
    const exportBtn = $("#also-export-btn");
    if (exportBtn)
      exportBtn.onclick = () => {
        triggerDownload(html, page.username || "linkaura-page");
        showToast("HTML file downloaded ✦", "success");
      };
  }

  /* ─────────────────────────────────────────
     QR Code Generator
  ───────────────────────────────────────── */

  function generateQR(url) {
    const canvas = $("#qr-canvas");
    if (!canvas) return;

    if (typeof QRCode !== "undefined") {
      // Use qrcode.js library
      QRCode.toCanvas(
        canvas,
        url,
        {
          width: 140,
          margin: 1,
          color: {
            dark: "#f0ede8",
            light: "#0000", // transparent background
          },
          errorCorrectionLevel: "M",
        },
        (err) => {
          if (err) console.warn("QR error:", err);
        },
      );
    } else {
      // Fallback: show URL as text if library not loaded
      canvas.style.display = "none";
    }
  }

  /* ─────────────────────────────────────────
     HTML Download (always-works fallback)
  ───────────────────────────────────────── */

  function triggerDownload(html, username) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}-linkaura.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  /* ─────────────────────────────────────────
     Event Binding
  ───────────────────────────────────────── */

  function bindEvents() {
    // Close modal
    const closeBtn = $("#share-modal-close");
    const backdrop = $("#share-modal-backdrop");
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    if (backdrop) backdrop.addEventListener("click", closeModal);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    // Retry button
    const retryBtn = $("#share-retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", () => {
        const page = window.LinkAuraApp?.getCurrentPageData?.();
        if (page) publish(page);
      });
    }

    // Offline / download fallback button
    const offlineBtn = $("#share-offline-btn");
    if (offlineBtn) {
      offlineBtn.addEventListener("click", () => {
        const page = window.LinkAuraApp?.getCurrentPageData?.();
        if (!page) return;
        const html = window.LinkAuraApp?.generatePageHtml?.(page) || "";
        triggerDownload(html, page.username || "linkaura-page");
        closeModal();
        showToast(
          "HTML file downloaded — host it anywhere for free ✦",
          "info",
          5000,
        );
      });
    }

    // Publish button in editor
    const publishBtn = $("#publish-btn");
    if (publishBtn) {
      publishBtn.addEventListener("click", () => {
        // Auto-save first
        $("#save-page-btn")?.click();
        const page = window.LinkAuraApp?.getCurrentPageData?.();
        if (page) publish(page);
      });
    }

    // Also export from pages manager cards
    document.addEventListener("linkaura:export", (e) => {
      const page = e.detail;
      if (!page) return;
      const html = window.LinkAuraApp?.generatePageHtml?.(page) || "";
      triggerDownload(html, page.username || "linkaura-page");
    });

    // Publish from pages manager cards
    document.addEventListener("linkaura:publish", (e) => {
      const page = e.detail;
      if (page) publish(page);
    });
  }

  /* ─────────────────────────────────────────
     Init
  ───────────────────────────────────────── */

  function init() {
    bindEvents();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ─────────────────────────────────────────
     Public API
  ───────────────────────────────────────── */
  window.LinkAuraPublish = {
    publish,
    triggerDownload,
    closeModal,
    VIEWER_BASE,
  };
})();
