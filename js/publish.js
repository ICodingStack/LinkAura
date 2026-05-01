"use strict";

(function () {
  const { $, showToast, copyToClipboard } = window.LinkAuraUtils;

  /* ─────────────────────────────────────────
     Configuration — يغيّرها المستخدم مرة واحدة
  ───────────────────────────────────────── */
  const JSONBIN_API_KEY =
    "$2a$10$pKG2tcn1LfncZ86Jh/gpnONdFai68ULxXRpkRjzKo0xKv1HcY511m";
  const VIEWER_BASE = "https://icodingstack.github.io/LinkAura/view.html";

  /* ─────────────────────────────────────────
     Modal helpers
  ───────────────────────────────────────── */
  const showModal = () => $("#share-modal")?.removeAttribute("hidden");
  const closeModal = () => $("#share-modal")?.setAttribute("hidden", "");

  function showState(id) {
    ["share-publishing", "share-success", "share-error"].forEach((s) => {
      const el = $("#" + s);
      if (el) el.hidden = s !== id;
    });
  }

  /* ─────────────────────────────────────────
     Main publish flow
  ───────────────────────────────────────── */
  async function publish(page) {
    showModal();
    showState("share-publishing");

    // Collect FULL page data from editor (always fresh)
    const freshPage = window.LinkAuraApp?.getCurrentPageData?.() || page;

    // Strip large avatar base64 if > 80KB (JSONbin 100KB limit)
    const pageData = { ...freshPage };
    if (pageData.avatar && pageData.avatar.length > 80000) {
      pageData.avatar = null; // omit oversized images
    }
    // Strip gallery images too
    if (pageData.gallery && pageData.gallery.length) {
      pageData.gallery = []; // galleries too large for free JSONbin
    }

    try {
      const binId = await uploadToJsonbin(pageData);
      const shareUrl = `${VIEWER_BASE}?id=${binId}`;
      showSuccessState(shareUrl, pageData);
    } catch (err) {
      console.error("[LinkAura publish]", err);
      showState("share-error");
      const msgEl = $("#share-error-msg");
      if (msgEl)
        msgEl.textContent = err.message || "Upload failed. Please try again.";
    }
  }

  /* ─────────────────────────────────────────
     JSONbin upload — stores page data JSON
  ───────────────────────────────────────── */
  async function uploadToJsonbin(pageData) {
    if (JSONBIN_API_KEY.includes("placeholder")) {
      throw new Error(
        "JSONbin API key not set. Open js/publish.js and add your key from jsonbin.io",
      );
    }

    const res = await fetch("https://api.jsonbin.io/v3/b", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": JSONBIN_API_KEY,
        "X-Bin-Private": "false",
        "X-Bin-Name": pageData.profileName || pageData.name || "LinkAura",
      },
      body: JSON.stringify({ page: pageData }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `JSONbin error (HTTP ${res.status})`);
    }

    const result = await res.json();
    const binId = result.metadata?.id;
    if (!binId) throw new Error("No bin ID returned.");
    return binId;
  }

  /* ─────────────────────────────────────────
     Success state
  ───────────────────────────────────────── */
  function showSuccessState(url, pageData) {
    showState("share-success");

    const linkEl = $("#share-link-display");
    if (linkEl) {
      linkEl.textContent = url.replace("https://", "");
      linkEl.href = url;
    }

    const copyBtn = $("#copy-share-link");
    if (copyBtn) {
      copyBtn.onclick = async () => {
        await copyToClipboard(url);
        copyBtn.innerHTML =
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>';
        showToast("Link copied ✦", "success");
        setTimeout(() => {
          copyBtn.innerHTML =
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        }, 2500);
      };
    }

    generateQR(url);

    // Social share
    const text = encodeURIComponent("Check out my LinkAura page: " + url);
    const btn = (id, href) => {
      const el = $("#" + id);
      if (el) el.onclick = () => window.open(href, "_blank", "noopener");
    };
    btn("share-twitter", "https://twitter.com/intent/tweet?text=" + text);
    btn("share-whatsapp", "https://wa.me/?text=" + text);
    $("#share-instagram") &&
      ($("#share-instagram").onclick = async () => {
        await copyToClipboard(url);
        showToast(
          "Link copied — paste it in your Instagram bio! 📸",
          "success",
          4000,
        );
      });

    // Also export HTML
    const exportBtn = $("#also-export-btn");
    if (exportBtn)
      exportBtn.onclick = () => {
        const html = window.LinkAuraApp?.generatePageHtml?.(pageData) || "";
        triggerDownload(html, pageData.username || "linkaura-page");
      };
  }

  /* ─────────────────────────────────────────
     QR Code
  ───────────────────────────────────────── */
  function generateQR(url) {
    const canvas = $("#qr-canvas");
    if (!canvas || typeof QRCode === "undefined") return;
    QRCode.toCanvas(canvas, url, {
      width: 140,
      margin: 1,
      color: { dark: "#f0ede8", light: "#00000000" },
      errorCorrectionLevel: "M",
    });
  }

  /* ─────────────────────────────────────────
     HTML download fallback
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
     Events
  ───────────────────────────────────────── */
  function bindEvents() {
    $("#share-modal-close")?.addEventListener("click", closeModal);
    $("#share-modal-backdrop")?.addEventListener("click", closeModal);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeModal();
    });

    $("#share-retry-btn")?.addEventListener("click", () => {
      const p = window.LinkAuraApp?.getCurrentPageData?.();
      if (p) publish(p);
    });

    $("#share-offline-btn")?.addEventListener("click", () => {
      const p = window.LinkAuraApp?.getCurrentPageData?.();
      if (!p) return;
      const html = window.LinkAuraApp?.generatePageHtml?.(p) || "";
      triggerDownload(html, p.username || "linkaura-page");
      closeModal();
      showToast("HTML downloaded — host it anywhere free ✦", "info", 4000);
    });

    $("#publish-btn")?.addEventListener("click", () => {
      $("#save-page-btn")?.click();
      setTimeout(() => {
        const p = window.LinkAuraApp?.getCurrentPageData?.();
        if (p) publish(p);
      }, 200);
    });
  }

  function init() {
    bindEvents();
  }
  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", init)
    : init();

  window.LinkAuraPublish = {
    publish,
    triggerDownload,
    closeModal,
    VIEWER_BASE,
  };
})();
