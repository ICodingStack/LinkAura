# ✦ LinkAura

> **Your Links, Elevated** — The most elegant and intelligent link-in-bio page builder.

![LinkAura Preview](https://img.shields.io/badge/LinkAura-v1.0.0-gold?style=flat-square)
![License: MIT](https://img.shields.io/badge/License-MIT-brightgreen?style=flat-square)
![No Backend](https://img.shields.io/badge/Backend-None%20required-blue?style=flat-square)
![Vanilla JS](https://img.shields.io/badge/JS-Vanilla-yellow?style=flat-square)

LinkAura is a **completely free, open-source, 100% client-side** link-in-bio builder that delivers a premium experience on par with paid tools like Linktree, Beacons, and Carrd — with intelligent AI-powered suggestions, luxury design aesthetics, and a real-time live preview editor.

---

## ✨ Features

### Core
- **Drag & Drop Link Management** — Reorder links with smooth drag-and-drop interactions
- **Real-Time Live Preview** — Phone-frame preview updates instantly as you type
- **Profile Editor** — Upload avatar, set name, bio, username, and social profile handles
- **Auto-Save** — Pages saved automatically to localStorage every 30 seconds
- **Multiple Pages** — Create, edit, duplicate, and delete multiple LinkAura pages
- **One-Click Copy Link** — Copy your shareable URL with a single click

### AI Smart Builder
- **AI Onboarding** — Enter your name, niche, and vibe → get a fully populated page
- **Bio Suggestions** — 3 contextual bio variations per niche
- **Smart Link Suggestions** — Relevant link recommendations based on your niche
- **Niche Auto-Detection** — Pattern-matches your text to 12 supported niches

### Niche Templates (12 included)
Influencer · Photographer · Developer · Coach · Musician · Designer · YouTuber · Consultant · Visual Artist · Writer · Podcaster · Freelancer

### Design & Customization
- **Dark / Light Mode** — Elegant toggle with smooth transitions
- **10 Accent Colors** — Curated palette + custom color picker
- **4 Background Styles** — Particles · Gradient · Mesh · Minimal
- **4 Link Card Styles** — Glass · Solid · Outline · Soft
- **3 Typography Options** — Editorial (Cormorant) · Modern (DM Sans) · Mono (DM Mono)
- **Animated Particle Canvas** — Ambient floating particles using accent colors

### Mini Website Mode
- Toggle to expand your link page into a full personal website
- **About Section** — Longer story text
- **Gallery** — Upload up to 6 images in a beautiful grid
- **Contact Form** — Embedded contact form preview

---

## 🗂️ Project Structure

```
linkaura/
├── index.html              # Main HTML — semantic, accessible, single-page
├── css/
│   └── style.css           # All styles — CSS custom properties, dark/light theme
├── js/
│   ├── utils.js            # Shared helpers (DOM, storage, clipboard, color utils)
│   ├── theme-manager.js    # Dark/light toggle, accent colors, backgrounds, particles
│   ├── link-manager.js     # Link CRUD, drag & drop, social links, icon detection
│   ├── ai-suggestions.js   # Niche templates, bio generation, link suggestions
│   └── main.js             # App orchestrator — views, preview, pages, events
├── assets/
│   └── icons/              # Reserved for custom SVG icon assets
├── README.md
├── LICENSE
└── .gitignore
```

---

## 🚀 Getting Started

### Option 1: Open directly (no build step)
```bash
git clone https://github.com/yourusername/linkaura.git
cd linkaura
open index.html
```

Or just drag `index.html` into any browser — it works offline.

### Option 2: Serve locally
```bash
# Using Python
python3 -m http.server 3000

# Using Node.js
npx serve .

# Using VS Code
# Install Live Server extension → right-click index.html → Open with Live Server
```

---

## 🌐 Deployment

LinkAura is a static site — deploy anywhere for free:

| Platform | Command |
|----------|---------|
| **Netlify** | Drag & drop the folder at netlify.com/drop |
| **Vercel** | `npx vercel` |
| **GitHub Pages** | Push to `gh-pages` branch |
| **Cloudflare Pages** | Connect your repo at pages.cloudflare.com |

---

## 🎨 Tech Stack

| Concern | Choice | Reason |
|---------|--------|--------|
| Styling | Tailwind CSS (CDN) + custom CSS | Utility classes + design tokens |
| JavaScript | Vanilla ES6+ | Zero dependencies, maximum performance |
| Fonts | Google Fonts (Cormorant Garamond, DM Sans, DM Mono) | Premium editorial aesthetic |
| Storage | localStorage | No backend, fully offline capable |
| Animation | Canvas 2D API + CSS animations | Smooth particle system |

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl + S` | Save current page |
| `Esc` | Close modals |
| `Enter` | Confirm link edits |

---

## 🧩 Extending LinkAura

### Add a new niche template
In `js/ai-suggestions.js`, add an entry to `NICHE_TEMPLATES`:
```javascript
{
  id: 'photographer',
  name: 'Photographer',
  emoji: '📷',
  desc: 'Visual storyteller',
  accent: '#94a3b8',
  bio: (name) => `📷 ${name} — capturing light & emotion worldwide.`,
  links: [
    { title: 'Portfolio', url: 'https://myportfolio.com', icon: '🖼️' },
    // ...
  ],
}
```

### Add a new accent color
In `js/theme-manager.js`, add to `COLOR_PALETTE`:
```javascript
{ hex: '#your-hex', name: 'Your Color Name' }
```

### Add a new social platform
In `js/link-manager.js`, add to `SOCIAL_PLATFORMS`:
```javascript
{ key: 'threads', label: 'Threads', icon: '🧵', placeholder: '@handle' }
```

---

## 📄 License

MIT License — free for personal and commercial use. See [LICENSE](LICENSE).

---

## 🙏 Credits

Designed and built with love for creators everywhere.

- Typography: [Google Fonts](https://fonts.google.com)
- CSS utilities: [Tailwind CSS](https://tailwindcss.com)
- Icons: Custom SVGs

---

<p align="center">
  <strong>LinkAura</strong> — Your Links, Elevated ✦
</p>
