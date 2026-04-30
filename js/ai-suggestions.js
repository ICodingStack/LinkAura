/**
 * LinkAura — ai-suggestions.js
 * Client-side "AI" intelligence for bio suggestions, link ordering,
 * icon choices, and niche templates. All logic runs locally — no API key needed.
 * Intelligence comes from curated niche data + smart pattern matching.
 */

'use strict';

(function () {
  const { $, showToast, escapeHtml, uid } = window.LinkAuraUtils;

  /* ─────────────────────────────────────────
     Niche Template Library
  ───────────────────────────────────────── */

  const NICHE_TEMPLATES = [
    {
      id: 'influencer',
      name: 'Influencer',
      emoji: '✨',
      desc: 'Lifestyle & content creator',
      accent: '#f472b6',
      bio: (name) => `✨ Content creator & lifestyle curator. Living beautifully and sharing every moment. DMs open for collabs 💌`,
      links: [
        { title: 'My Latest Collab', url: 'https://instagram.com', icon: '📸' },
        { title: 'Shop My Looks', url: 'https://shopmy.us', icon: '🛍️' },
        { title: 'Watch My Videos', url: 'https://youtube.com', icon: '▶️' },
        { title: 'My Amazon Storefront', url: 'https://amazon.com', icon: '📦' },
        { title: 'Work With Me', url: '#', icon: '💌' },
      ],
    },
    {
      id: 'photographer',
      name: 'Photographer',
      emoji: '📷',
      desc: 'Visual storyteller',
      accent: '#94a3b8',
      bio: (name) => `📷 Visual storyteller capturing light, emotion & fleeting moments. Available for bookings worldwide.`,
      links: [
        { title: 'Portfolio', url: 'https://myportfolio.com', icon: '🖼️' },
        { title: 'Book a Session', url: 'https://calendly.com', icon: '📅' },
        { title: 'Prints Shop', url: 'https://etsy.com', icon: '🛒' },
        { title: 'Instagram', url: 'https://instagram.com', icon: '📸' },
        { title: 'Behind the Lens (Blog)', url: '#', icon: '✍️' },
      ],
    },
    {
      id: 'developer',
      name: 'Developer',
      emoji: '💻',
      desc: 'Builder & open source contributor',
      accent: '#34d399',
      bio: (name) => `💻 Full-stack developer & open source contributor. Building things that matter. Always shipping.`,
      links: [
        { title: 'GitHub', url: 'https://github.com', icon: '🐙' },
        { title: 'Portfolio', url: '#', icon: '🌐' },
        { title: 'Latest Article', url: 'https://dev.to', icon: '✍️' },
        { title: 'Hire Me', url: 'https://linkedin.com', icon: '💼' },
        { title: 'Buy Me a Coffee', url: 'https://buymeacoffee.com', icon: '☕' },
      ],
    },
    {
      id: 'coach',
      name: 'Coach',
      emoji: '🎯',
      desc: 'Life & business coach',
      accent: '#fbbf24',
      bio: (name) => `🎯 Certified coach helping ambitious people unlock their full potential. 500+ clients transformed.`,
      links: [
        { title: 'Book a Free Call', url: 'https://calendly.com', icon: '📅' },
        { title: 'My Coaching Program', url: '#', icon: '🚀' },
        { title: 'Free Resources', url: '#', icon: '🎁' },
        { title: 'Podcast', url: 'https://spotify.com', icon: '🎙️' },
        { title: 'Newsletter', url: 'https://substack.com', icon: '📬' },
      ],
    },
    {
      id: 'musician',
      name: 'Musician',
      emoji: '🎵',
      desc: 'Artist & performer',
      accent: '#a78bfa',
      bio: (name) => `🎵 Independent artist making music that moves you. New single out now — stream everywhere.`,
      links: [
        { title: 'Listen on Spotify', url: 'https://spotify.com', icon: '🎧' },
        { title: 'Apple Music', url: 'https://music.apple.com', icon: '🎵' },
        { title: 'YouTube Channel', url: 'https://youtube.com', icon: '▶️' },
        { title: 'Merch Store', url: '#', icon: '👕' },
        { title: 'Tour Dates', url: '#', icon: '🎤' },
      ],
    },
    {
      id: 'designer',
      name: 'Designer',
      emoji: '🎨',
      desc: 'UI/UX & brand designer',
      accent: '#f97316',
      bio: (name) => `🎨 Designer crafting beautiful, functional digital experiences. Brand identity · UI/UX · Motion.`,
      links: [
        { title: 'Dribbble Portfolio', url: 'https://dribbble.com', icon: '🏀' },
        { title: 'Behance', url: 'https://behance.net', icon: '🎨' },
        { title: 'Design Templates', url: 'https://gumroad.com', icon: '📐' },
        { title: 'Freelance Inquiry', url: 'https://calendly.com', icon: '📅' },
        { title: 'Design Newsletter', url: 'https://substack.com', icon: '📬' },
      ],
    },
    {
      id: 'youtuber',
      name: 'YouTuber',
      emoji: '▶️',
      desc: 'Video creator',
      accent: '#ef4444',
      bio: (name) => `▶️ Making videos that educate, entertain & inspire. New video every week — subscribe so you never miss out!`,
      links: [
        { title: 'Latest Video', url: 'https://youtube.com', icon: '▶️' },
        { title: 'Subscribe on YouTube', url: 'https://youtube.com', icon: '🔔' },
        { title: 'Podcast Version', url: 'https://spotify.com', icon: '🎙️' },
        { title: 'Merch', url: '#', icon: '👕' },
        { title: 'Sponsor My Channel', url: '#', icon: '📧' },
      ],
    },
    {
      id: 'consultant',
      name: 'Consultant',
      emoji: '📊',
      desc: 'Strategy & business expert',
      accent: '#60a5fa',
      bio: (name) => `📊 Business consultant helping companies scale smarter. Ex-McKinsey. $50M+ in results delivered.`,
      links: [
        { title: 'Work With Me', url: 'https://calendly.com', icon: '📅' },
        { title: 'Case Studies', url: '#', icon: '📋' },
        { title: 'LinkedIn', url: 'https://linkedin.com', icon: '💼' },
        { title: 'Newsletter', url: 'https://substack.com', icon: '📬' },
        { title: 'Speaking Engagements', url: '#', icon: '🎤' },
      ],
    },
    {
      id: 'artist',
      name: 'Visual Artist',
      emoji: '🖌️',
      desc: 'Painter & illustrator',
      accent: '#e879f9',
      bio: (name) => `🖌️ Creating art that lives at the intersection of the real and the imagined. Commissions open.`,
      links: [
        { title: 'Shop Originals', url: 'https://etsy.com', icon: '🛍️' },
        { title: 'Commission Me', url: '#', icon: '✉️' },
        { title: 'Instagram', url: 'https://instagram.com', icon: '📸' },
        { title: 'Digital Prints', url: 'https://gumroad.com', icon: '🖼️' },
        { title: 'Patreon', url: 'https://patreon.com', icon: '🎁' },
      ],
    },
    {
      id: 'writer',
      name: 'Writer',
      emoji: '✍️',
      desc: 'Author & storyteller',
      accent: '#2dd4bf',
      bio: (name) => `✍️ Author, essayist & newsletter writer. Exploring ideas that matter. Words are my currency.`,
      links: [
        { title: 'Newsletter (Subscribe)', url: 'https://substack.com', icon: '📬' },
        { title: 'My Book', url: '#', icon: '📚' },
        { title: 'Latest Essay', url: 'https://medium.com', icon: '✍️' },
        { title: 'Twitter / X', url: 'https://x.com', icon: '𝕏' },
        { title: 'Speaking', url: '#', icon: '🎤' },
      ],
    },
    {
      id: 'podcaster',
      name: 'Podcaster',
      emoji: '🎙️',
      desc: 'Audio storyteller',
      accent: '#fb7185',
      bio: (name) => `🎙️ Host of [Your Show Name] — weekly conversations that challenge, inspire & entertain. Hit play.`,
      links: [
        { title: 'Spotify', url: 'https://spotify.com', icon: '🎧' },
        { title: 'Apple Podcasts', url: 'https://podcasts.apple.com', icon: '🎵' },
        { title: 'YouTube', url: 'https://youtube.com', icon: '▶️' },
        { title: 'Be a Guest', url: 'https://calendly.com', icon: '📅' },
        { title: 'Support the Show', url: 'https://patreon.com', icon: '🎁' },
      ],
    },
    {
      id: 'freelancer',
      name: 'Freelancer',
      emoji: '🚀',
      desc: 'Independent professional',
      accent: '#a3e635',
      bio: (name) => `🚀 Freelance specialist available for exciting projects. Fast, reliable & quality-obsessed.`,
      links: [
        { title: 'Hire Me', url: 'https://calendly.com', icon: '📅' },
        { title: 'Portfolio', url: '#', icon: '🌐' },
        { title: 'Upwork Profile', url: 'https://upwork.com', icon: '💼' },
        { title: 'Testimonials', url: '#', icon: '⭐' },
        { title: 'Contact', url: 'mailto:', icon: '✉️' },
      ],
    },
  ];

  /* ─────────────────────────────────────────
     Niche Detection from Free Text
  ───────────────────────────────────────── */

  const NICHE_KEYWORDS = {
    influencer:   ['influencer', 'content creator', 'lifestyle', 'fashion', 'beauty', 'aesthetic', 'creator'],
    photographer: ['photographer', 'photography', 'photo', 'camera', 'visual', 'portrait', 'wedding'],
    developer:    ['developer', 'engineer', 'coder', 'programmer', 'software', 'fullstack', 'frontend', 'backend', 'devops'],
    coach:        ['coach', 'coaching', 'mentor', 'consultant', 'life coach', 'business coach', 'mindset'],
    musician:     ['musician', 'music', 'artist', 'singer', 'producer', 'band', 'dj', 'rapper', 'songwriter'],
    designer:     ['designer', 'design', 'ui', 'ux', 'graphic', 'brand', 'creative director', 'art director'],
    youtuber:     ['youtuber', 'youtube', 'video', 'vlogger', 'vlog', 'content'],
    consultant:   ['consultant', 'strategy', 'business', 'advisor', 'executive', 'management'],
    artist:       ['artist', 'painter', 'illustrator', 'drawing', 'art', 'watercolor', 'sketch'],
    writer:       ['writer', 'author', 'blogger', 'journalist', 'essayist', 'copywriter', 'editor'],
    podcaster:    ['podcaster', 'podcast', 'host', 'interviewer', 'audio'],
    freelancer:   ['freelancer', 'freelance', 'independent', 'remote', 'contract'],
  };

  function detectNiche(text = '') {
    const lower = text.toLowerCase();
    let best = null;
    let bestScore = 0;
    for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
      const score = keywords.filter(kw => lower.includes(kw)).length;
      if (score > bestScore) { bestScore = score; best = niche; }
    }
    return best || 'influencer'; // default
  }

  /* ─────────────────────────────────────────
     Bio Variations (more personality per niche)
  ───────────────────────────────────────── */

  const BIO_VARIATIONS = {
    influencer: [
      (n) => `✨ Hi, I'm ${n}! Sharing beauty, travel & moments that make life worth living. Collabs: 👇`,
      (n) => `${n} | Content creator obsessed with aesthetics, wellness & good vibes. DMs always open 💌`,
      (n) => `Curating a beautiful life, one post at a time. Follow along 🌸 — ${n}`,
    ],
    developer: [
      (n) => `💻 ${n} — building the web, one commit at a time. OSS contributor. Hire me 👇`,
      (n) => `Engineer by day, side-project addict by night. I ship things that matter.`,
      (n) => `${n} | Full-stack dev · TypeScript · React · Always learning, always building.`,
    ],
    photographer: [
      (n) => `📷 ${n} — capturing light & emotion worldwide. Bookings open 👇`,
      (n) => `Stories told through a lens. Portrait · Wedding · Editorial — ${n}`,
      (n) => `I don't just take photos — I preserve moments. Let's create something beautiful.`,
    ],
    coach: [
      (n) => `🎯 ${n} | Helping high-achievers unlock their next level. 500+ transformations.`,
      (n) => `Your potential is limitless. I'm here to prove it. — ${n}, Certified Coach`,
      (n) => `Life is too short for average. Book a free call and let's talk about your vision 👇`,
    ],
    musician: [
      (n) => `🎵 ${n} — independent artist making music that moves you. Stream it everywhere.`,
      (n) => `Singer · Songwriter · Dreamer. New music every season. — ${n}`,
      (n) => `My songs are love letters to life. Hit play and stay a while 🎧`,
    ],
    designer: [
      (n) => `🎨 ${n} — designing the spaces between pixels. UI · Brand · Motion.`,
      (n) => `Good design is invisible. Great design is unforgettable. Available for freelance.`,
      (n) => `Creating beauty with purpose. Brands, interfaces & everything in between — ${n}`,
    ],
    default: [
      (n) => `Hi, I'm ${n}! Welcome to my corner of the internet. Everything important is below 👇`,
      (n) => `${n} — passionate, driven, and always creating. Find everything here.`,
      (n) => `Turning ideas into reality. Follow along for updates, projects & more.`,
    ],
  };

  function generateBio(name = '', niche = '', vibe = '') {
    const variations = BIO_VARIATIONS[niche] || BIO_VARIATIONS.default;
    const idx = Math.floor(Math.random() * variations.length);
    let bio = variations[idx](name || 'You');

    // Apply vibe adjustments
    if (vibe) {
      const v = vibe.toLowerCase();
      if (v.includes('minimal') || v.includes('clean')) {
        bio = bio.replace(/[✨🎯🎨💻📷🎵▶️📊🖌️✍️🎙️🚀]/g, '').trim();
      }
      if (v.includes('playful') || v.includes('fun')) {
        bio += ' 🎉';
      }
      if (v.includes('professional') || v.includes('formal')) {
        bio = bio.replace(/[💌👇🎉]/g, '').trim();
      }
    }

    return bio;
  }

  /* ─────────────────────────────────────────
     Full AI Generation (onboarding)
  ───────────────────────────────────────── */

  /**
   * Simulates AI generation with a pleasant delay.
   * Returns a fully populated page config.
   */
  function generatePage(name, nicheText, vibe) {
    return new Promise((resolve) => {
      // Simulate thinking time (600–1200ms)
      const delay = 600 + Math.random() * 600;
      setTimeout(() => {
        const nicheId = detectNiche(nicheText);
        const template = NICHE_TEMPLATES.find(t => t.id === nicheId) || NICHE_TEMPLATES[0];
        const bio = generateBio(name, nicheId, vibe);

        resolve({
          nicheId,
          template,
          bio,
          suggestedLinks: template.links.map(l => ({
            ...l,
            id: uid('link'),
            active: true,
          })),
          accent: template.accent,
        });
      }, delay);
    });
  }

  /* ─────────────────────────────────────────
     Contextual Suggestions (in-editor)
  ───────────────────────────────────────── */

  /**
   * Generate bio suggestions given current profile context.
   * @param {string} name
   * @param {string} currentBio
   * @param {string} niche
   * @returns {string[]} Array of bio suggestions
   */
  function suggestBios(name, currentBio, niche) {
    const nicheId = niche ? detectNiche(niche) : 'default';
    const variations = BIO_VARIATIONS[nicheId] || BIO_VARIATIONS.default;
    return variations.map(fn => fn(name || 'You'));
  }

  /**
   * Suggest additional links based on detected niche.
   * @param {string} niche
   * @param {string[]} existingUrls - already added URLs (to avoid dupes)
   * @returns {Array} Suggested link objects
   */
  function suggestLinks(niche, existingUrls = []) {
    const nicheId = detectNiche(niche);
    const template = NICHE_TEMPLATES.find(t => t.id === nicheId) || NICHE_TEMPLATES[0];
    return template.links.filter(l => {
      const domain = l.url.replace('https://', '').split('/')[0];
      return !existingUrls.some(u => u.includes(domain));
    }).map(l => ({ ...l, id: uid('link'), active: true }));
  }

  /* ─────────────────────────────────────────
     Modal UI
  ───────────────────────────────────────── */

  function openAiModal(type, context = {}) {
    const modal = $('#ai-modal');
    const content = $('#ai-suggestions-content');
    const title = $('#ai-modal-title');
    if (!modal || !content || !title) return;

    modal.removeAttribute('hidden');
    content.innerHTML = renderLoadingState();

    // Simulate brief generation delay
    setTimeout(() => {
      if (type === 'bio') {
        title.textContent = 'Bio Suggestions';
        const bios = suggestBios(context.name, context.bio, context.niche);
        content.innerHTML = renderBioSuggestions(bios);
      } else if (type === 'links') {
        title.textContent = 'Link Suggestions';
        const existingUrls = (context.links || []).map(l => l.url);
        const suggested = suggestLinks(context.niche || '', existingUrls);
        content.innerHTML = renderLinkSuggestions(suggested);
      }
    }, 700);
  }

  function closeAiModal() {
    const modal = $('#ai-modal');
    if (modal) modal.setAttribute('hidden', '');
  }

  function renderLoadingState() {
    return `
      <div class="la-suggestion-loading">
        <span class="la-spinner"></span>
        <span>Crafting suggestions…</span>
      </div>
    `;
  }

  function renderBioSuggestions(bios) {
    return bios.map((bio, i) => `
      <div class="la-suggestion-item" data-bio="${escapeHtml(bio)}" tabindex="0" role="button"
           aria-label="Use bio option ${i + 1}">
        <div class="la-suggestion-item__label">Option ${i + 1}</div>
        <div class="la-suggestion-item__text">${escapeHtml(bio)}</div>
      </div>
    `).join('') + `
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.75rem;text-align:center;">
        Click any option to apply it to your page.
      </p>
    `;
  }

  function renderLinkSuggestions(links) {
    if (!links.length) {
      return `<p style="text-align:center;color:var(--text-muted);font-size:0.8125rem;padding:1.5rem;">
        Looks like you already have great links! Try adding more from the editor.
      </p>`;
    }
    return links.map((link, i) => `
      <div class="la-suggestion-item" data-link='${JSON.stringify(link)}' tabindex="0" role="button"
           aria-label="Add ${link.title} link">
        <div class="la-suggestion-item__label">${link.icon} Suggested Link</div>
        <div class="la-suggestion-item__text"><strong>${escapeHtml(link.title)}</strong>
          <br><span style="font-family:monospace;font-size:0.7rem;opacity:0.6">${escapeHtml(link.url)}</span>
        </div>
      </div>
    `).join('') + `
      <p style="font-size:0.75rem;color:var(--text-muted);margin-top:0.75rem;text-align:center;">
        Click any suggestion to add it to your links.
      </p>
    `;
  }

  /* ─────────────────────────────────────────
     Event Binding
  ───────────────────────────────────────── */

  function bindEvents() {
    // Close modal
    const closeBtn = $('#ai-modal-close');
    const backdrop = $('#ai-modal-backdrop');
    if (closeBtn) closeBtn.addEventListener('click', closeAiModal);
    if (backdrop) backdrop.addEventListener('click', closeAiModal);

    // Keyboard close
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAiModal();
    });

    // Delegate suggestion clicks
    const content = $('#ai-suggestions-content');
    if (content) {
      content.addEventListener('click', handleSuggestionClick);
      content.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') handleSuggestionClick(e);
      });
    }

    // Suggest Bio button
    const suggestBioBtn = $('#suggest-bio-btn');
    if (suggestBioBtn) {
      suggestBioBtn.addEventListener('click', () => {
        const name = $('#profile-name')?.value || '';
        const bio = $('#profile-bio')?.value || '';
        openAiModal('bio', { name, bio });
      });
    }

    // Suggest Links button
    const suggestLinksBtn = $('#suggest-links-btn');
    if (suggestLinksBtn) {
      suggestLinksBtn.addEventListener('click', () => {
        const niche = $('#ai-niche')?.value || $('#profile-bio')?.value || '';
        const links = window.LinkAuraLinks?.getLinks() || [];
        openAiModal('links', { niche, links });
      });
    }
  }

  function handleSuggestionClick(e) {
    const item = e.target.closest('.la-suggestion-item');
    if (!item) return;

    // Bio suggestion
    if (item.dataset.bio) {
      const bioField = $('#profile-bio');
      if (bioField) {
        bioField.value = item.dataset.bio;
        bioField.dispatchEvent(new Event('input'));
        closeAiModal();
        const { showToast } = window.LinkAuraUtils;
        showToast('Bio applied ✦', 'success');
      }
      return;
    }

    // Link suggestion
    if (item.dataset.link) {
      try {
        const linkData = JSON.parse(item.dataset.link);
        window.LinkAuraLinks?.addLink(linkData);
        item.style.opacity = '0.4';
        item.style.pointerEvents = 'none';
        const { showToast } = window.LinkAuraUtils;
        showToast(`"${linkData.title}" added to your links ✦`, 'success');
        document.dispatchEvent(new CustomEvent('linkaura:previewrefresh'));
      } catch {}
    }
  }

  /* ─────────────────────────────────────────
     Template Chips Rendering
  ───────────────────────────────────────── */

  function renderTemplateChips(activeId = null) {
    const container = $('#template-chips');
    if (!container) return;
    container.innerHTML = '';

    NICHE_TEMPLATES.forEach(tpl => {
      const chip = document.createElement('button');
      chip.className = `la-chip${tpl.id === activeId ? ' active' : ''}`;
      chip.dataset.template = tpl.id;
      chip.setAttribute('aria-pressed', tpl.id === activeId);
      chip.setAttribute('aria-label', `Apply ${tpl.name} template`);
      chip.innerHTML = `${tpl.emoji} ${tpl.name}`;
      chip.addEventListener('click', () => applyTemplate(tpl.id));
      container.appendChild(chip);
    });
  }

  function renderLandingTemplates() {
    const grid = $('#template-grid');
    if (!grid) return;
    grid.innerHTML = '';

    NICHE_TEMPLATES.forEach(tpl => {
      const card = document.createElement('div');
      card.className = 'la-template-card';
      card.dataset.template = tpl.id;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Use ${tpl.name} template`);
      card.innerHTML = `
        <div class="la-template-card__emoji">${tpl.emoji}</div>
        <div class="la-template-card__name">${tpl.name}</div>
        <div class="la-template-card__desc">${tpl.desc}</div>
      `;
      card.addEventListener('click', () => {
        applyTemplate(tpl.id);
        // Navigate to builder
        document.dispatchEvent(new CustomEvent('linkaura:navigate', { detail: 'builder' }));
      });
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') card.click();
      });
      grid.appendChild(card);
    });
  }

  function applyTemplate(templateId) {
    const tpl = NICHE_TEMPLATES.find(t => t.id === templateId);
    if (!tpl) return;

    // Apply accent color
    window.LinkAuraTheme?.applyAccent(tpl.accent);

    // Set links
    const links = tpl.links.map(l => ({ ...l, id: uid('link'), active: true }));
    window.LinkAuraLinks?.setLinks(links);

    // Set bio if empty
    const bioField = $('#profile-bio');
    if (bioField && !bioField.value.trim()) {
      const name = $('#profile-name')?.value || '';
      bioField.value = tpl.bio(name);
      bioField.dispatchEvent(new Event('input'));
    }

    // Update template chips
    renderTemplateChips(templateId);

    document.dispatchEvent(new CustomEvent('linkaura:previewrefresh'));
    const { showToast } = window.LinkAuraUtils;
    showToast(`${tpl.emoji} ${tpl.name} template applied`, 'success');
  }

  /* ─────────────────────────────────────────
     Init
  ───────────────────────────────────────── */

  function init() {
    bindEvents();
    renderLandingTemplates();
    renderTemplateChips();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* ─────────────────────────────────────────
     Public API
  ───────────────────────────────────────── */
  window.LinkAuraAI = {
    NICHE_TEMPLATES,
    detectNiche,
    generatePage,
    generateBio,
    suggestBios,
    suggestLinks,
    openAiModal,
    closeAiModal,
    applyTemplate,
    renderTemplateChips,
    renderLandingTemplates,
  };
})();
