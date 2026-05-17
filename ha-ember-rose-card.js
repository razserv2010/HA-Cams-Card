/**
 * Camera Navigation Card for Home Assistant
 * Navigate to any HA view/page with stunning animated UI
 * HACS-compatible | HA 2025 | Full dark/light theme support
 */

const VERSION = "1.0.0";

// ─── Editor ─────────────────────────────────────────────────────────────────

class CameraNavCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  get _schema() {
    return [
      {
        name: "title",
        label: "Card Title",
        selector: { text: {} },
      },
      {
        name: "subtitle",
        label: "Subtitle",
        selector: { text: {} },
      },
      {
        name: "navigate_to",
        label: "Navigate To (path, e.g. /cameras)",
        selector: { text: {} },
      },
      {
        name: "camera_count",
        label: "Number of Active Cameras",
        selector: { number: { min: 0, max: 99, mode: "box" } },
      },
      {
        name: "icon",
        label: "Icon",
        selector: { icon: {} },
      },
      {
        name: "color_scheme",
        label: "Color Scheme",
        selector: {
          select: {
            options: [
              { value: "ocean", label: "Ocean Blue" },
              { value: "ember", label: "Ember Orange" },
              { value: "aurora", label: "Aurora Purple" },
              { value: "forest", label: "Forest Green" },
              { value: "rose", label: "Rose Gold" },
            ],
          },
        },
      },
      {
        name: "show_pulse",
        label: "Show Live Pulse Animation",
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

// ─── Card ────────────────────────────────────────────────────────────────────

class CameraNavCard extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._shadowAttached = false;
    this._animationFrame = null;
    this._scanAngle = 0;
    this._canvasInterval = null;
  }

  static getConfigElement() {
    return document.createElement("ha-ember-rose-card-editor");
  }

  static getStubConfig() {
    return {
      title: "מצלמות",
      subtitle: "לחץ לצפייה",
      navigate_to: "/cameras",
      camera_count: 4,
      icon: "mdi:cctv",
      color_scheme: "ocean",
      show_pulse: true,
    };
  }

  setConfig(config) {
    this._config = {
      title: "מצלמות",
      subtitle: "לחץ לצפייה",
      navigate_to: "/cameras",
      camera_count: 4,
      icon: "mdi:cctv",
      color_scheme: "ocean",
      show_pulse: true,
      ...config,
    };

    if (this._shadowAttached) {
      this._updateCard();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._shadowAttached) {
      this._initCard();
    }
  }

  _getScheme(name) {
    const schemes = {
      ocean: {
        primary: "#0ea5e9",
        secondary: "#38bdf8",
        glow: "rgba(14,165,233,0.4)",
        gradA: "#0c4a6e",
        gradB: "#0369a1",
        accent: "#7dd3fc",
        ring: "rgba(14,165,233,0.15)",
      },
      ember: {
        primary: "#f97316",
        secondary: "#fb923c",
        glow: "rgba(249,115,22,0.4)",
        gradA: "#7c2d12",
        gradB: "#c2410c",
        accent: "#fed7aa",
        ring: "rgba(249,115,22,0.15)",
      },
      aurora: {
        primary: "#a855f7",
        secondary: "#c084fc",
        glow: "rgba(168,85,247,0.4)",
        gradA: "#3b0764",
        gradB: "#6b21a8",
        accent: "#e9d5ff",
        ring: "rgba(168,85,247,0.15)",
      },
      forest: {
        primary: "#22c55e",
        secondary: "#4ade80",
        glow: "rgba(34,197,94,0.4)",
        gradA: "#14532d",
        gradB: "#15803d",
        accent: "#bbf7d0",
        ring: "rgba(34,197,94,0.15)",
      },
      rose: {
        primary: "#f43f5e",
        secondary: "#fb7185",
        glow: "rgba(244,63,94,0.4)",
        gradA: "#881337",
        gradB: "#be123c",
        accent: "#fecdd3",
        ring: "rgba(244,63,94,0.15)",
      },
    };
    return schemes[name] || schemes.ocean;
  }

  _initCard() {
    if (this._shadowAttached) return;
    this.attachShadow({ mode: "open" });
    this._shadowAttached = true;
    this._updateCard();
  }

  _updateCard() {
    if (!this._shadowAttached) return;
    const s = this._getScheme(this._config.color_scheme || "ocean");
    const cfg = this._config;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --primary: ${s.primary};
          --secondary: ${s.secondary};
          --glow: ${s.glow};
          --grad-a: ${s.gradA};
          --grad-b: ${s.gradB};
          --accent: ${s.accent};
          --ring: ${s.ring};
        }

        .card {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          cursor: pointer;
          user-select: none;
          min-height: 140px;
          background: linear-gradient(135deg, var(--grad-a) 0%, var(--grad-b) 100%);
          box-shadow:
            0 4px 24px rgba(0,0,0,0.3),
            0 0 0 1px rgba(255,255,255,0.07),
            inset 0 1px 0 rgba(255,255,255,0.12);
          transition: transform 0.18s cubic-bezier(.34,1.56,.64,1),
                      box-shadow 0.18s ease;
          -webkit-tap-highlight-color: transparent;
          font-family: var(--paper-font-body1_-_font-family, sans-serif);
        }

        .card:hover {
          transform: translateY(-3px) scale(1.012);
          box-shadow:
            0 12px 40px rgba(0,0,0,0.4),
            0 0 0 1px rgba(255,255,255,0.1),
            0 0 40px var(--glow),
            inset 0 1px 0 rgba(255,255,255,0.14);
        }

        .card:active {
          transform: scale(0.97);
          box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        }

        /* Radar canvas background */
        .radar-wrap {
          position: absolute;
          inset: 0;
          overflow: hidden;
          opacity: 0.18;
        }
        canvas.radar {
          position: absolute;
          right: -20px;
          top: 50%;
          transform: translateY(-50%);
          width: 200px;
          height: 200px;
        }

        /* Grid overlay */
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 24px 24px;
        }

        /* Shimmer */
        .shimmer {
          position: absolute;
          top: -60%;
          left: -40%;
          width: 180%;
          height: 220%;
          background: linear-gradient(
            105deg,
            transparent 40%,
            rgba(255,255,255,0.05) 50%,
            transparent 60%
          );
          animation: shimmer 4s ease-in-out infinite;
        }
        @keyframes shimmer {
          0%   { transform: translateX(-100%) rotate(0deg); }
          100% { transform: translateX(60%) rotate(0deg); }
        }

        /* Content */
        .content {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 22px 20px;
        }

        /* Icon area */
        .icon-wrap {
          position: relative;
          flex-shrink: 0;
          width: 68px;
          height: 68px;
        }

        .icon-ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid var(--primary);
          animation: ring-pulse 2.5s ease-in-out infinite;
          box-shadow: 0 0 0 0 var(--glow);
        }

        .icon-ring-2 {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          border: 1px solid var(--ring);
          animation: ring-pulse 2.5s ease-in-out infinite 0.8s;
        }

        @keyframes ring-pulse {
          0%   { opacity: 1; transform: scale(1); }
          70%  { opacity: 0; transform: scale(1.25); }
          100% { opacity: 0; transform: scale(1.25); }
        }

        .icon-bg {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle, var(--glow) 0%, transparent 70%);
        }

        .icon-inner {
          position: absolute;
          inset: 6px;
          border-radius: 50%;
          background: rgba(0,0,0,0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(4px);
          border: 1px solid rgba(255,255,255,0.12);
        }

        ha-icon.main-icon {
          --mdc-icon-size: 30px;
          color: var(--primary);
          filter: drop-shadow(0 0 8px var(--glow));
          animation: icon-glow 3s ease-in-out infinite;
        }

        @keyframes icon-glow {
          0%, 100% { filter: drop-shadow(0 0 6px var(--glow)); }
          50%       { filter: drop-shadow(0 0 14px var(--primary)); }
        }

        /* Text */
        .text {
          flex: 1;
          min-width: 0;
        }

        .title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          line-height: 1.2;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
          direction: rtl;
        }

        .subtitle {
          margin-top: 4px;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--accent);
          opacity: 0.85;
          direction: rtl;
        }

        .camera-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-top: 10px;
          padding: 4px 10px;
          border-radius: 20px;
          background: rgba(0,0,0,0.3);
          border: 1px solid rgba(255,255,255,0.1);
          font-size: 0.75rem;
          color: var(--accent);
          backdrop-filter: blur(4px);
        }

        .live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--primary);
          box-shadow: 0 0 6px var(--primary);
          animation: live-blink 1.4s ease-in-out infinite;
        }

        @keyframes live-blink {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.3; transform: scale(0.7); }
        }

        /* Arrow chevron */
        .arrow {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.12);
          transition: background 0.2s, transform 0.2s;
        }

        .card:hover .arrow {
          background: rgba(255,255,255,0.16);
          transform: translateX(-3px);
        }

        ha-icon.arrow-icon {
          --mdc-icon-size: 18px;
          color: rgba(255,255,255,0.7);
        }

        /* Ripple */
        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255,255,255,0.15);
          transform: scale(0);
          animation: ripple-anim 0.6s linear;
          pointer-events: none;
        }
        @keyframes ripple-anim {
          to { transform: scale(4); opacity: 0; }
        }
      </style>

      <ha-card class="card" tabindex="0" role="button" aria-label="${cfg.title}">
        <div class="radar-wrap">
          <canvas class="radar" width="200" height="200"></canvas>
        </div>
        <div class="grid-overlay"></div>
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
            <div class="title">${this._escapeHtml(cfg.title)}</div>
            ${cfg.subtitle ? `<div class="subtitle">${this._escapeHtml(cfg.subtitle)}</div>` : ""}
            ${
              cfg.camera_count !== undefined
                ? `<div class="camera-badge">
                  ${cfg.show_pulse !== false ? '<div class="live-dot"></div>' : ""}
                  LIVE · ${cfg.camera_count} מצלמות פעילות
                </div>`
                : ""
            }
          </div>

          <div class="arrow">
            <ha-icon class="arrow-icon" icon="mdi:chevron-left"></ha-icon>
          </div>
        </div>
      </ha-card>
    `;

    this._startRadar(s);
    this._attachEvents();
  }

  _startRadar(s) {
    if (this._canvasInterval) {
      clearInterval(this._canvasInterval);
      this._canvasInterval = null;
    }

    const canvas = this.shadowRoot.querySelector("canvas.radar");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const W = 200;
    const CX = W / 2;
    const CY = W / 2;
    const R = 80;

    // Parse primary color to rgba
    const hexToRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };
    const c = hexToRgb(s.primary);
    const colorStr = `${c.r},${c.g},${c.b}`;

    let angle = 0;

    const draw = () => {
      ctx.clearRect(0, 0, W, W);

      // Rings
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.arc(CX, CY, (R / 4) * i, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${colorStr},0.3)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Cross hairs
      ctx.strokeStyle = `rgba(${colorStr},0.2)`;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(CX - R, CY);
      ctx.lineTo(CX + R, CY);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(CX, CY - R);
      ctx.lineTo(CX, CY + R);
      ctx.stroke();

      // Sweep gradient
      const sweep = ctx.createConicalGradient
        ? null // not standard, we fake it
        : null;

      const startA = angle - 0.01;
      const trailLength = Math.PI * 0.7;

      const grad = ctx.createLinearGradient(CX, CY, CX + R, CY);
      for (let t = 0; t <= 20; t++) {
        const a = angle - (trailLength * t) / 20;
        const alpha = ((20 - t) / 20) * 0.7;
        ctx.beginPath();
        ctx.moveTo(CX, CY);
        ctx.arc(CX, CY, R, a, a + trailLength / 20);
        ctx.closePath();
        ctx.fillStyle = `rgba(${colorStr},${alpha * 0.15})`;
        ctx.fill();
      }

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(angle) * R, CY + Math.sin(angle) * R);
      ctx.strokeStyle = `rgba(${colorStr},0.9)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Blip dot
      const blipR = 70;
      const blipA = angle - 0.3;
      const bx = CX + Math.cos(blipA) * blipR * 0.6;
      const by = CY + Math.sin(blipA) * blipR * 0.6;
      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${colorStr},0.9)`;
      ctx.fill();

      angle = (angle + 0.03) % (Math.PI * 2);
    };

    this._canvasInterval = setInterval(draw, 30);
  }

  _attachEvents() {
    if (!this.shadowRoot) return;
    const card = this.shadowRoot.querySelector(".card");
    if (!card) return;

    card.addEventListener("click", (e) => {
      this._addRipple(e, card);
      this._navigate();
    });

    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this._navigate();
      }
    });
  }

  _navigate() {
    const path = this._config.navigate_to || "/cameras";
    if (this._hass) {
      this._hass.callService
        ? window.history.pushState(null, "", path)
        : window.history.pushState(null, "", path);
    }
    window.dispatchEvent(new CustomEvent("location-changed"));
  }

  _addRipple(e, card) {
    const rect = card.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px`;
    card.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove());
  }

  _escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  disconnectedCallback() {
    if (this._canvasInterval) {
      clearInterval(this._canvasInterval);
      this._canvasInterval = null;
    }
  }

  getCardSize() {
    return 2;
  }
}

customElements.define("ha-ember-rose-card", CameraNavCard);

// ─── Registration ────────────────────────────────────────────────────────────

window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === "ha-ember-rose-card")) {
  window.customCards.push({
    type: "ha-ember-rose-card",
    name: "Camera Navigation Card",
    description: "Navigate to your cameras view with live radar animation",
    preview: true,
    documentationURL:
      "https://github.com/razserv2010/calcio-live-card-heb",
  });
}

console.info(
  `%c ha-ember-rose-card %c v${VERSION} `,
  "background:#0ea5e9;color:#fff;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px",
  "background:#0c4a6e;color:#7dd3fc;border-radius:0 4px 4px 0;padding:2px 6px"
);
