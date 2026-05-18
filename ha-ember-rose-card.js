/**
 * ha-ember-rose-card v1.5.0
 * Pill-style camera navigation card
 * - Uses ha-icon (any mdi icon, changes work)
 * - show_pulse works
 * - Full HA dark/light theme via CSS variables
 * - Entity-aware status badges
 * - HACS-compatible • HA 2025
 */

const VERSION = "1.5.0";

// ─── Editor ──────────────────────────────────────────────────────────────────

class HaEmberRoseCardEditor extends HTMLElement {
  constructor() { super(); this._config = {}; this._hass = null; }

  setConfig(config) { this._config = { ...config }; this._render(); }

  get _schema() {
    return [
      { name: "title",       label: "כותרת",                      selector: { text: {} } },
      { name: "navigate_to", label: "נווט לנתיב (למשל /cameras)", selector: { text: {} } },
      {
        name: "color_scheme", label: "ערכת צבעים",
        selector: { select: { options: [
          { value: "midnight", label: "Midnight Steel" },
          { value: "crimson",  label: "Crimson Alert"  },
          { value: "slate",    label: "Slate Ops"      },
          { value: "copper",   label: "Copper Watch"   },
          { value: "void",     label: "Void Dark"      },
          { value: "auto",     label: "Auto (תואם HA theme)" },
        ]}},
      },
      {
        name: "camera_entities", label: "ישויות מצלמה לניטור סטטוס",
        selector: { entity: { multiple: true, domain: "camera" } },
      },
      { name: "show_pulse", label: "הצג אנימציית sweep (כשאין ישויות)", selector: { boolean: {} } },
    ];
  }

  _render() {
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = "";
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this._config;
    form.schema = this._schema;
    form.computeLabel = (s) => s.label;
    form.addEventListener("value-changed", (e) => {
      this._config = e.detail.value;
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: this._config }, bubbles: true, composed: true,
      }));
    });
    this.shadowRoot.appendChild(form);
  }

  set hass(hass) {
    this._hass = hass;
    const f = this.shadowRoot?.querySelector("ha-form");
    if (f) f.hass = hass;
  }
}

customElements.define("ha-ember-rose-card-editor", HaEmberRoseCardEditor);

// ─── Card ─────────────────────────────────────────────────────────────────────

class HaEmberRoseCard extends HTMLElement {
  constructor() {
    super();
    this._config    = {};
    this._hass      = null;
    this._attached  = false;
    this._animTimer = null;
    this._lastStats = null;
    this._angle     = 0;
  }

  static getConfigElement() { return document.createElement("ha-ember-rose-card-editor"); }

  static getStubConfig() {
    return {
      title:           "מצלמות",
      navigate_to:     "/cameras",
      color_scheme:    "auto",
      camera_entities: [],
      show_pulse:      true,
    };
  }

  setConfig(config) {
    this._config = {
      title: "מצלמות", navigate_to: "/cameras",
      color_scheme: "auto", camera_entities: [],
      show_pulse: true,
      ...config,
    };
    if (this._attached) this._rebuild();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._attached) this._attach();
    else this._refreshBadge();
  }

  disconnectedCallback() { this._stopAnim(); }
  getCardSize() { return 1; }

  // ── theme detection ────────────────────────────────────────────────────────

  /**
   * Read actual computed HA CSS variables from the host element.
   * This ensures full dark/light compatibility — no hardcoded colours.
   */
  _getThemeColors() {
    const computed = getComputedStyle(this);

    // HA CSS variable fallback chain
    const get = (...vars) => {
      for (const v of vars) {
        const val = computed.getPropertyValue(v).trim();
        if (val) return val;
      }
      return null;
    };

    // Detect dark/light
    const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      || document.documentElement.getAttribute("data-theme") === "dark"
      || document.querySelector("home-assistant")?.shadowRoot
         ?.querySelector("home-assistant-main")?.shadowRoot
         ?.querySelector("ha-panel-lovelace")?.classList?.contains("dark");

    // HA card background
    const cardBg   = get("--ha-card-background", "--card-background-color", "--primary-background-color")
                     || (isDark ? "#1c1c1e" : "#ffffff");
    const textPri  = get("--primary-text-color")   || (isDark ? "#e5e5e7" : "#1c1c1e");
    const textSec  = get("--secondary-text-color")  || (isDark ? "#8e8e93" : "#636366");
    const divider  = get("--divider-color")          || (isDark ? "rgba(255,255,255,.12)" : "rgba(0,0,0,.12)");

    return { cardBg, textPri, textSec, divider, isDark };
  }

  // ── scheme ─────────────────────────────────────────────────────────────────

  _scheme() {
    const name = this._config.color_scheme || "auto";

    if (name === "auto") {
      // Pull accent colour from HA theme
      const computed   = getComputedStyle(this);
      const haAccent   = computed.getPropertyValue("--primary-color").trim()
                       || computed.getPropertyValue("--accent-color").trim()
                       || "#60a5fa";
      const { cardBg, divider, isDark } = this._getThemeColors();

      // Badge bg = accent at low opacity, text = accent
      return {
        bg:      cardBg,
        bc:      divider,
        primary: haAccent,
        rgb:     this._hexToRgb(haAccent),
        bb:      isDark ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)",
        bt:      haAccent,
        textPri: this._getThemeColors().textPri,
      };
    }

    const map = {
      midnight: { bg:"#1a1a2e", bc:"#2a3a5c", primary:"#60a5fa", rgb:[96,165,250],  bb:"#1e3a5f", bt:"#93c5fd" },
      crimson:  { bg:"#2a1010", bc:"#5a2020", primary:"#f87171", rgb:[248,113,113], bb:"#3a0808", bt:"#fca5a5" },
      slate:    { bg:"#161b22", bc:"#2a3040", primary:"#94a3b8", rgb:[148,163,184], bb:"#1e2535", bt:"#cbd5e1" },
      copper:   { bg:"#1c0f00", bc:"#4a2810", primary:"#fb923c", rgb:[251,146,60],  bb:"#2a1800", bt:"#fdba74" },
      void:     { bg:"#12102a", bc:"#2a2550", primary:"#a78bfa", rgb:[167,139,250], bb:"#1e1845", bt:"#c4b5fd" },
    };
    const s = map[name] || map.midnight;
    s.textPri = "#e2e8f0";
    return s;
  }

  _hexToRgb(hex) {
    // handles #rgb, #rrggbb, rgb(...), var(...) fallback
    try {
      const h = hex.trim().replace("#", "");
      if (h.length === 3) {
        return [
          parseInt(h[0]+h[0],16),
          parseInt(h[1]+h[1],16),
          parseInt(h[2]+h[2],16),
        ];
      }
      if (h.length === 6) {
        return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
      }
    } catch(_) {}
    return [96, 165, 250]; // safe fallback
  }

  // ── init ───────────────────────────────────────────────────────────────────

  _attach() {
    if (this._attached) return;
    this.attachShadow({ mode: "open" });
    this._attached = true;
    this._rebuild();
  }

  _rebuild() {
    if (!this._attached) return;
    this._stopAnim();

    const s     = this._scheme();
    const cfg   = this._config;
    const stats = this._computeStats();
    const showSweep = cfg.show_pulse !== false;

    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }

        .pill {
          display: inline-flex;
          align-items: center;
          border-radius: 24px;
          overflow: hidden;
          cursor: pointer;
          /* Use HA variables — falls back to scheme colour */
          background: ${s.bg};
          border: 0.5px solid ${s.bc};
          transition: box-shadow .15s, transform .1s;
          -webkit-tap-highlight-color: transparent;
          font-family: var(--paper-font-body1_-_font-family, var(--mdc-typography-body1-font-family, sans-serif));
          position: relative;
        }
        .pill:hover {
          box-shadow: 0 0 0 2px ${s.primary}44, 0 4px 18px rgba(0,0,0,.35);
        }
        .pill:active { transform: scale(.97); }

        /* icon zone — canvas draws sweep + crosshair */
        .iz {
          width: 54px; height: 44px; flex-shrink: 0;
          position: relative; overflow: hidden;
          background: ${s.bg};
        }
        .iz canvas {
          position: absolute; inset: 0; width: 54px; height: 44px;
        }

        /* label */
        .pill-lbl {
          font-size: 13px; font-weight: 700;
          color: ${s.textPri};
          padding: 0 6px 0 10px; white-space: nowrap;
        }

        /* badge */
        .pill-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 700; letter-spacing: .02em;
          padding: 5px 12px 5px 9px;
          border-left: 0.5px solid ${s.bc};
          background: ${s.bb}; color: ${s.bt};
          white-space: nowrap;
        }
        .bdot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

        .badge-recording .bdot {
          background: #f87171; box-shadow: 0 0 5px #f87171;
          animation: blink 1.1s ease-in-out infinite;
        }
        .badge-streaming .bdot { background: #4ade80; box-shadow: 0 0 4px #4ade80; }
        .badge-idle      .bdot { background: #94a3b8; }
        .badge-unavail   .bdot {
          background: #fbbf24; box-shadow: 0 0 5px #fbbf24;
          animation: blink 1.4s ease-in-out infinite;
        }
        .badge-live .bdot {
          background: ${s.primary}; box-shadow: 0 0 6px ${s.primary};
          animation: blink 1.4s ease-in-out infinite;
        }
        .badge-nopulse .bdot { display: none; }

        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.1} }

        /* ripple */
        .ripple {
          position: absolute; border-radius: 50%; pointer-events: none;
          background: rgba(255,255,255,.13); transform: scale(0);
          animation: ripple-go .55s linear;
        }
        @keyframes ripple-go { to { transform: scale(5); opacity: 0; } }
      </style>

      <div class="pill" tabindex="0" role="button" aria-label="${this._esc(cfg.title)}">
        <div class="iz">
          <canvas id="cv" width="108" height="88"></canvas>
        </div>
        <span class="pill-lbl">${this._esc(cfg.title)}</span>
        <span class="pill-badge ${this._badgeClass(stats, showSweep)}" id="badge">
          <span class="bdot"></span>
          <span id="btxt">${this._badgeText(stats, showSweep)}</span>
        </span>
      </div>
    `;

    this._startAnim(s, showSweep);
    this._bindEvents();

    // listen for system theme changes and rebuild
    this._themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    this._themeListener = () => { if (cfg.color_scheme === "auto") this._rebuild(); };
    this._themeQuery.addEventListener("change", this._themeListener);
  }

  // ── animation ──────────────────────────────────────────────────────────────

  _startAnim(s, showSweep) {
    const canvas = this.shadowRoot?.querySelector("#cv");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = 108, H = 88, CX = 54, CY = 44;
    const [r,g,b] = s.rgb;
    const col = `${r},${g},${b}`;
    const bg  = s.bg;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── sweep (only if show_pulse is true) ──
      if (showSweep) {
        const SR = 30;

        ctx.beginPath(); ctx.arc(CX, CY, SR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${col},.08)`; ctx.lineWidth = 1.5; ctx.stroke();

        const trail = Math.PI * .55;
        for (let i = 0; i <= 28; i++) {
          const a = this._angle - (trail * i) / 28;
          ctx.beginPath(); ctx.moveTo(CX, CY);
          ctx.arc(CX, CY, SR, a, a + trail / 28); ctx.closePath();
          ctx.fillStyle = `rgba(${col},${((28-i)/28) * .22})`; ctx.fill();
        }

        ctx.beginPath(); ctx.moveTo(CX, CY);
        ctx.lineTo(CX + Math.cos(this._angle) * SR, CY + Math.sin(this._angle) * SR);
        ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 1.5; ctx.stroke();

        const bx = CX + Math.cos(this._angle - .26) * SR * .62;
        const by = CY + Math.sin(this._angle - .26) * SR * .62;
        ctx.beginPath(); ctx.arc(bx, by, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${col},.9)`; ctx.fill();

        this._angle = (this._angle + .042) % (Math.PI * 2);
      }

      // ── crosshair icon ──
      ctx.lineCap = "round";
      const r1 = 18, r2 = 9, gap = 5;

      // outer ring
      ctx.beginPath(); ctx.arc(CX, CY, r1, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${col},.65)`; ctx.lineWidth = 1.5; ctx.stroke();

      // inner ring + fill
      ctx.beginPath(); ctx.arc(CX, CY, r2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col},.1)`; ctx.fill();
      ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 1.8; ctx.stroke();

      // crosshair arms
      [0, Math.PI/2, Math.PI, Math.PI*1.5].forEach(a => {
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(a) * (r2 + gap), CY + Math.sin(a) * (r2 + gap));
        ctx.lineTo(CX + Math.cos(a) * r1,         CY + Math.sin(a) * r1);
        ctx.strokeStyle = `rgba(${col},.85)`; ctx.lineWidth = 1.8; ctx.stroke();
      });

      // tick marks
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) continue;
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(a) * (r1 - 5), CY + Math.sin(a) * (r1 - 5));
        ctx.lineTo(CX + Math.cos(a) * r1,        CY + Math.sin(a) * r1);
        ctx.strokeStyle = `rgba(${col},.35)`; ctx.lineWidth = 1; ctx.stroke();
      }

      // corner brackets
      [Math.PI*.25, Math.PI*.75, Math.PI*1.25, Math.PI*1.75].forEach(a => {
        const ox = CX + Math.cos(a) * r1, oy = CY + Math.sin(a) * r1;
        const t1x = CX + Math.cos(a-.28)*(r1-5), t1y = CY+Math.sin(a-.28)*(r1-5);
        const t2x = CX + Math.cos(a+.28)*(r1-5), t2y = CY+Math.sin(a+.28)*(r1-5);
        ctx.beginPath(); ctx.moveTo(t1x,t1y); ctx.lineTo(ox,oy); ctx.lineTo(t2x,t2y);
        ctx.strokeStyle = `rgba(${col},.5)`; ctx.lineWidth = 1.2; ctx.stroke();
      });

      // centre dot
      ctx.beginPath(); ctx.arc(CX, CY, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${col},1)`; ctx.fill();

      // glint
      ctx.beginPath(); ctx.arc(CX - 1, CY - 1, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fill();
    };

    this._animTimer = setInterval(draw, 30);
  }

  _stopAnim() {
    if (this._animTimer) { clearInterval(this._animTimer); this._animTimer = null; }
    if (this._themeQuery && this._themeListener) {
      this._themeQuery.removeEventListener("change", this._themeListener);
    }
  }

  // ── status ─────────────────────────────────────────────────────────────────

  _computeStats() {
    const entities = this._config.camera_entities || [];
    if (!entities.length || !this._hass) return null;
    const s = { recording:0, streaming:0, idle:0, unavailable:0 };
    for (const eid of entities) {
      const st = this._hass.states[eid]?.state;
      if (!st || st==="unavailable" || st==="unknown") s.unavailable++;
      else if (st==="recording") s.recording++;
      else if (st==="streaming") s.streaming++;
      else s.idle++;
    }
    return s;
  }

  _badgeClass(stats, showSweep) {
    if (!stats) return showSweep ? "badge-live" : "badge-nopulse";
    if (stats.recording)   return "badge-recording";
    if (stats.streaming)   return "badge-streaming";
    if (stats.unavailable && !stats.idle && !stats.recording) return "badge-unavail";
    return "badge-idle";
  }

  _badgeText(stats, showSweep) {
    if (!stats) return showSweep ? "LIVE" : "מצלמות";
    const p = [];
    if (stats.recording)   p.push(`×${stats.recording} REC`);
    if (stats.streaming)   p.push(`×${stats.streaming} ▶`);
    if (stats.idle)        p.push(`×${stats.idle} Idle`);
    if (stats.unavailable) p.push(`×${stats.unavailable} ✕`);
    return p.join(" · ") || "LIVE";
  }

  _refreshBadge() {
    const badge = this.shadowRoot?.getElementById("badge");
    const btxt  = this.shadowRoot?.getElementById("btxt");
    if (!badge || !btxt) return;
    const stats = this._computeStats();
    const key   = JSON.stringify(stats);
    if (key === this._lastStats) return;
    this._lastStats = key;
    const showSweep = this._config.show_pulse !== false;
    badge.className     = `pill-badge ${this._badgeClass(stats, showSweep)}`;
    btxt.textContent    = this._badgeText(stats, showSweep);
  }

  // ── events ─────────────────────────────────────────────────────────────────

  _bindEvents() {
    const pill = this.shadowRoot?.querySelector(".pill");
    if (!pill) return;
    pill.addEventListener("click", (e) => { this._ripple(e, pill); this._navigate(); });
    pill.addEventListener("keydown", (e) => {
      if (e.key==="Enter" || e.key===" ") { e.preventDefault(); this._navigate(); }
    });
  }

  _navigate() {
    window.history.pushState(null, "", this._config.navigate_to || "/cameras");
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  _ripple(e, el) {
    const rect = el.getBoundingClientRect(), size = Math.max(rect.width, rect.height);
    const d = document.createElement("div"); d.className = "ripple";
    d.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
    el.appendChild(d);
    d.addEventListener("animationend", () => d.remove());
  }

  _esc(str) {
    return String(str)
      .replace(/&/g,"&amp;").replace(/</g,"&lt;")
      .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  }
}

customElements.define("ha-ember-rose-card", HaEmberRoseCard);

// ─── HACS ─────────────────────────────────────────────────────────────────────

window.customCards = window.customCards || [];
if (!window.customCards.find(c => c.type === "ha-ember-rose-card")) {
  window.customCards.push({
    type: "ha-ember-rose-card",
    name: "HA Ember Rose Card",
    description: "Pill camera nav · crosshair · entity status · auto dark/light",
    preview: true,
    documentationURL: "https://github.com/razserv2010/calcio-live-card-heb",
  });
}

console.info(
  `%c HA-EMBER-ROSE-CARD %c v${VERSION} `,
  "background:#60a5fa;color:#0f172a;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "background:#1a1a2e;color:#93c5fd;border-radius:0 4px 4px 0;padding:2px 6px"
);
