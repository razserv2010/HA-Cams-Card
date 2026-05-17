/**
 * Camera Navigation Card for Home Assistant
 * Navigate to any HA view/page with animated radar background
 * Entity-aware camera status • HACS-compatible • HA 2025
 */

const VERSION = "1.1.0";

// ─── Editor ──────────────────────────────────────────────────────────────────

class CameraNavCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  get _schema() {
    return [
      {
        name: "title",
        label: "כותרת הכרטיס",
        selector: { text: {} },
      },
      {
        name: "subtitle",
        label: "כותרת משנה",
        selector: { text: {} },
      },
      {
        name: "navigate_to",
        label: "נווט לנתיב (למשל /cameras)",
        selector: { text: {} },
      },
      {
        name: "icon",
        label: "אייקון",
        selector: { icon: {} },
      },
      {
        name: "color_scheme",
        label: "ערכת צבעים",
        selector: {
          select: {
            options: [
              { value: "ocean",  label: "Ocean Blue"    },
              { value: "ember",  label: "Ember Orange"  },
              { value: "aurora", label: "Aurora Purple" },
              { value: "forest", label: "Forest Green"  },
              { value: "rose",   label: "Rose Gold"     },
            ],
          },
        },
      },
      {
        name: "camera_entities",
        label: "ישויות מצלמה (בחר מצלמות לניטור סטטוס)",
        selector: {
          entity: {
            multiple: true,
            domain: "camera",
          },
        },
      },
      {
        name: "show_pulse",
        label: "הצג אנימציית פולס חי",
        selector: { boolean: {} },
      },
    ];
  }

  _render() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }
    this.shadowRoot.innerHTML = "";

    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this._config;
    form.schema = this._schema;
    form.computeLabel = (s) => s.label;

    form.addEventListener("value-changed", (e) => {
      this._config = e.detail.value;
      this.dispatchEvent(
        new CustomEvent("config-changed", {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        })
      );
    });

    this.shadowRoot.appendChild(form);
  }

  set hass(hass) {
    this._hass = hass;
    const form = this.shadowRoot?.querySelector("ha-form");
    if (form) form.hass = hass;
  }
}

customElements.define("ha-ember-rose-card-editor", CameraNavCardEditor);

// ─── Card ─────────────────────────────────────────────────────────────────────

class CameraNavCard extends HTMLElement {
  constructor() {
    super();
    this._config     = {};
    this._hass       = null;
    this._attached   = false;
    this._radarTimer = null;
    this._lastStats  = null;
  }

  static getConfigElement() {
    return document.createElement("ha-ember-rose-card-editor");
  }

  static getStubConfig() {
    return {
      title:           "מצלמות",
      subtitle:        "לחץ לצפייה",
      navigate_to:     "/cameras",
      icon:            "mdi:cctv",
      color_scheme:    "ocean",
      camera_entities: [],
      show_pulse:      true,
    };
  }

  // ── lifecycle ──────────────────────────────────────────────────────────────

  setConfig(config) {
    this._config = {
      title:           "מצלמות",
      subtitle:        "לחץ לצפייה",
      navigate_to:     "/cameras",
      icon:            "mdi:cctv",
      color_scheme:    "ocean",
      camera_entities: [],
      show_pulse:      true,
      ...config,
    };
    if (this._attached) this._rebuild();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._attached) {
      this._attach();
    } else {
      this._refreshBadges();
    }
  }

  disconnectedCallback() {
    this._stopRadar();
  }

  getCardSize() { return 2; }

  // ── init ───────────────────────────────────────────────────────────────────

  _attach() {
    if (this._attached) return;
    this.attachShadow({ mode: "open" });
    this._attached = true;
    this._rebuild();
  }

  _rebuild() {
    if (!this._attached) return;
    this._stopRadar();

    const s     = this._scheme();
    const cfg   = this._config;
    const stats = this._computeStats();

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --p:  ${s.primary};
          --gl: ${s.glow};
          --ga: ${s.gradA};
          --gb: ${s.gradB};
          --ac: ${s.accent};
          --rn: ${s.ring};
        }

        .card {
          position: relative;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
          background: linear-gradient(135deg, var(--ga) 0%, var(--gb) 100%);
          box-shadow:
            0 4px 20px rgba(0,0,0,0.3),
            0 0 0 1px rgba(255,255,255,0.07),
            inset 0 1px 0 rgba(255,255,255,0.12);
          transition:
            transform 0.18s cubic-bezier(.34,1.56,.64,1),
            box-shadow 0.18s ease;
          -webkit-tap-highlight-color: transparent;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
        }
        .card:hover {
          transform: translateY(-2px) scale(1.01);
          box-shadow:
            0 10px 32px rgba(0,0,0,0.4),
            0 0 0 1px rgba(255,255,255,0.1),
            0 0 32px var(--gl),
            inset 0 1px 0 rgba(255,255,255,0.14);
        }
        .card:active { transform: scale(0.97); }

        .radar-wrap {
          position: absolute; inset: 0; overflow: hidden;
          opacity: 0.18; pointer-events: none;
        }
        canvas.radar {
          position: absolute; right: -16px; top: 50%;
          transform: translateY(-50%); width: 160px; height: 160px;
        }

        .grid {
          position: absolute; inset: 0; pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .shimmer {
          position: absolute; top: -60%; left: -40%;
          width: 180%; height: 220%; pointer-events: none;
          background: linear-gradient(
            105deg, transparent 40%,
            rgba(255,255,255,0.05) 50%, transparent 60%
          );
          animation: shimmer 4s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(60%); }
        }

        .content {
          position: relative; z-index: 2;
          display: flex; align-items: center; gap: 12px;
          padding: 14px 14px 14px 16px;
        }

        .icon-wrap {
          position: relative; flex-shrink: 0;
          width: 52px; height: 52px;
        }
        .icon-ring {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid var(--p);
          animation: ring-pulse 2.5s ease-in-out infinite;
        }
        .icon-ring-2 {
          position: absolute; inset: -7px; border-radius: 50%;
          border: 1px solid var(--rn);
          animation: ring-pulse 2.5s ease-in-out infinite 0.8s;
        }
        @keyframes ring-pulse {
          0%   { opacity: 1; transform: scale(1); }
          70%  { opacity: 0; transform: scale(1.3); }
          100% { opacity: 0; transform: scale(1.3); }
        }
        .icon-bg {
          position: absolute; inset: 0; border-radius: 50%;
          background: radial-gradient(circle, var(--gl) 0%, transparent 70%);
        }
        .icon-inner {
          position: absolute; inset: 5px; border-radius: 50%;
          background: rgba(0,0,0,0.25);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.12);
        }
        ha-icon.main-icon {
          --mdc-icon-size: 24px;
          color: var(--p);
          filter: drop-shadow(0 0 6px var(--gl));
          animation: icon-glow 3s ease-in-out infinite;
        }
        @keyframes icon-glow {
          0%,100% { filter: drop-shadow(0 0 5px var(--gl)); }
          50%      { filter: drop-shadow(0 0 12px var(--p)); }
        }

        .text { flex: 1; min-width: 0; }
        .title {
          font-size: 1rem; font-weight: 700; color: #fff;
          line-height: 1.2; letter-spacing: 0.01em;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3); direction: rtl;
        }
        .subtitle {
          margin-top: 2px; font-size: 0.72rem; font-weight: 500;
          color: var(--ac); opacity: 0.85; direction: rtl;
        }

        .badges {
          display: flex; flex-wrap: wrap; gap: 5px; margin-top: 7px;
        }
        .badge {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; border-radius: 20px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 0.68rem; font-weight: 600; color: #fff;
          backdrop-filter: blur(4px); letter-spacing: 0.02em;
        }
        .badge-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }

        /* recording — red pulsing */
        .badge-recording .badge-dot {
          background: #f87171; box-shadow: 0 0 4px #f87171;
          animation: dot-blink 1.2s ease-in-out infinite;
        }
        /* streaming — green steady */
        .badge-streaming .badge-dot {
          background: #4ade80; box-shadow: 0 0 4px #4ade80;
        }
        /* idle — dim accent */
        .badge-idle .badge-dot { background: var(--ac); opacity: 0.55; }
        /* unavailable — amber warning */
        .badge-unavailable .badge-dot {
          background: #fbbf24; box-shadow: 0 0 4px #fbbf24;
        }
        /* no entities — generic live */
        .badge-live .badge-dot {
          background: var(--p); box-shadow: 0 0 6px var(--p);
          animation: dot-blink 1.4s ease-in-out infinite;
        }

        @keyframes dot-blink {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.3; }
        }

        .arrow {
          flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          transition: background 0.2s, transform 0.2s;
        }
        .card:hover .arrow {
          background: rgba(255,255,255,0.16);
          transform: translateX(-2px);
        }
        ha-icon.arrow-icon { --mdc-icon-size: 16px; color: rgba(255,255,255,0.7); }

        .ripple {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,0.15);
          transform: scale(0);
          animation: ripple-go 0.55s linear;
          pointer-events: none;
        }
        @keyframes ripple-go { to { transform: scale(4); opacity: 0; } }
      </style>

      <ha-card class="card" tabindex="0" role="button" aria-label="${this._escape(cfg.title)}">
        <div class="radar-wrap"><canvas class="radar" width="160" height="160"></canvas></div>
        <div class="grid"></div>
        <div class="shimmer"></div>

        <div class="content">
          <div class="icon-wrap">
            <div class="icon-ring-2"></div>
            <div class="icon-ring"></div>
            <div class="icon-bg"></div>
            <div class="icon-inner">
              <ha-icon class="main-icon" icon="${cfg.icon || "mdi:cctv"}"></ha-icon>
            </div>
          </div>

          <div class="text">
            <div class="title">${this._escape(cfg.title)}</div>
            ${cfg.subtitle ? `<div class="subtitle">${this._escape(cfg.subtitle)}</div>` : ""}
            <div class="badges" id="badges">${this._renderBadges(stats)}</div>
          </div>

          <div class="arrow">
            <ha-icon class="arrow-icon" icon="mdi:chevron-left"></ha-icon>
          </div>
        </div>
      </ha-card>
    `;

    this._startRadar(s);
    this._bindEvents();
  }

  // ── status logic ──────────────────────────────────────────────────────────

  _computeStats() {
    const entities = this._config.camera_entities || [];
    if (!entities.length || !this._hass) return null;

    const stats = { recording: 0, streaming: 0, idle: 0, unavailable: 0, total: entities.length };

    for (const eid of entities) {
      const state = this._hass.states[eid]?.state;
      if (!state || state === "unavailable" || state === "unknown") {
        stats.unavailable++;
      } else if (state === "recording") {
        stats.recording++;
      } else if (state === "streaming") {
        stats.streaming++;
      } else {
        stats.idle++;
      }
    }
    return stats;
  }

  _renderBadges(stats) {
    if (!stats) {
      if (this._config.show_pulse === false) return "";
      return `<span class="badge badge-live"><span class="badge-dot"></span>LIVE</span>`;
    }

    const parts = [];

    if (stats.recording > 0)
      parts.push(`<span class="badge badge-recording"><span class="badge-dot"></span>${stats.recording > 1 ? "מקליט ×" + stats.recording : "מקליט"}</span>`);

    if (stats.streaming > 0)
      parts.push(`<span class="badge badge-streaming"><span class="badge-dot"></span>שידור ×${stats.streaming}</span>`);

    if (stats.idle > 0)
      parts.push(`<span class="badge badge-idle"><span class="badge-dot"></span>Idle ×${stats.idle}</span>`);

    if (stats.unavailable > 0)
      parts.push(`<span class="badge badge-unavailable"><span class="badge-dot"></span>לא זמין ×${stats.unavailable}</span>`);

    return parts.join("");
  }

  _refreshBadges() {
    const el = this.shadowRoot?.getElementById("badges");
    if (!el) return;
    const stats = this._computeStats();
    const key   = JSON.stringify(stats);
    if (key === this._lastStats) return;
    this._lastStats = key;
    el.innerHTML = this._renderBadges(stats);
  }

  // ── radar ─────────────────────────────────────────────────────────────────

  _startRadar(s) {
    const canvas = this.shadowRoot.querySelector("canvas.radar");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = 160, CX = 80, CY = 80, R = 66;

    const hex2rgb = (h) => ({
      r: parseInt(h.slice(1,3),16),
      g: parseInt(h.slice(3,5),16),
      b: parseInt(h.slice(5,7),16),
    });
    const { r, g, b } = hex2rgb(s.primary);
    const col = `${r},${g},${b}`;
    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, W);

      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(CX, CY, (R / 3) * i, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${col},0.3)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.strokeStyle = `rgba(${col},0.18)`;
      ctx.lineWidth = 0.5;
      [[CX-R,CY,CX+R,CY],[CX,CY-R,CX,CY+R]].forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      });

      const trail = Math.PI * 0.65;
      for (let t = 0; t <= 18; t++) {
        const a = angle - (trail * t) / 18;
        ctx.beginPath(); ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, R, a, a + trail / 18);
        ctx.closePath();
        ctx.fillStyle = `rgba(${col},${((18-t)/18)*0.12})`;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(angle)*R, CY + Math.sin(angle)*R);
      ctx.strokeStyle = `rgba(${col},0.9)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const bx = CX + Math.cos(angle-0.3)*R*0.55;
      const by = CY + Math.sin(angle-0.3)*R*0.55;
      ctx.beginPath(); ctx.arc(bx, by, 2.5, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${col},0.9)`; ctx.fill();

      angle = (angle + 0.03) % (Math.PI*2);
    };

    this._radarTimer = setInterval(draw, 30);
  }

  _stopRadar() {
    if (this._radarTimer) { clearInterval(this._radarTimer); this._radarTimer = null; }
  }

  // ── events ────────────────────────────────────────────────────────────────

  _bindEvents() {
    const card = this.shadowRoot?.querySelector(".card");
    if (!card) return;
    card.addEventListener("click", (e) => { this._ripple(e, card); this._navigate(); });
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this._navigate(); }
    });
  }

  _navigate() {
    window.history.pushState(null, "", this._config.navigate_to || "/cameras");
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  _ripple(e, card) {
    const rect = card.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const el   = document.createElement("div");
    el.className = "ripple";
    el.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
    card.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }

  // ── helpers ───────────────────────────────────────────────────────────────

  _escape(str) {
    return String(str)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }

  _scheme(name = this._config.color_scheme || "ocean") {
    const map = {
      ocean:  { primary:"#0ea5e9", glow:"rgba(14,165,233,0.4)",  gradA:"#0c4a6e", gradB:"#0369a1", accent:"#7dd3fc", ring:"rgba(14,165,233,0.15)"  },
      ember:  { primary:"#f97316", glow:"rgba(249,115,22,0.4)",  gradA:"#7c2d12", gradB:"#c2410c", accent:"#fed7aa", ring:"rgba(249,115,22,0.15)"  },
      aurora: { primary:"#a855f7", glow:"rgba(168,85,247,0.4)",  gradA:"#3b0764", gradB:"#6b21a8", accent:"#e9d5ff", ring:"rgba(168,85,247,0.15)"  },
      forest: { primary:"#22c55e", glow:"rgba(34,197,94,0.4)",   gradA:"#14532d", gradB:"#15803d", accent:"#bbf7d0", ring:"rgba(34,197,94,0.15)"   },
      rose:   { primary:"#f43f5e", glow:"rgba(244,63,94,0.4)",   gradA:"#881337", gradB:"#be123c", accent:"#fecdd3", ring:"rgba(244,63,94,0.15)"   },
    };
    return map[name] || map.ocean;
  }
}

customElements.define("ha-ember-rose-card", CameraNavCard);

// ─── HACS registration ────────────────────────────────────────────────────────

window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === "ha-ember-rose-card")) {
  window.customCards.push({
    type:             "ha-ember-rose-card",
    name:             "Camera Navigation Card",
    description:      "Navigate to your cameras view — entity-aware status badges",
    preview:          true,
    documentationURL: "https://github.com/razserv2010/calcio-live-card-heb",
  });
}

console.info(
  `%c ha-ember-rose-card %c v${VERSION} `,
  "background:#0ea5e9;color:#fff;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "background:#0c4a6e;color:#7dd3fc;border-radius:0 4px 4px 0;padding:2px 6px"
);
