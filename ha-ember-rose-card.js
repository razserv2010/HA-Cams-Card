class EmberRoseCard extends HTMLElement {
  setConfig(config) {
    this._config = {
      name: "מצלמות",
      nav_path: "/lovelace/cameras",

      tap_action: {
        action: "navigate",
        navigation_path: config.nav_path || "/lovelace/cameras",
      },

      day_bg: "#fff1f2",
      day_border: "#fda4af",
      day_name: "#4c0519",
      day_icon_from: "#fb7185",
      day_icon_to: "#f43f5e",

      night_bg: "#100008",
      night_border: "rgba(244,63,94,0.22)",
      night_name: "#ffe4e6",
      night_icon_from: "#4c0519",
      night_icon_to: "#881337",
      night_icon_col: "#fda4af",

      ...config,
    };

    this._config.tap_action = {
      action: "navigate",
      navigation_path: this._config.nav_path || "/lovelace/cameras",
    };

    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
    }

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
  }

  _isDark() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  _navigate() {
    const path = this._config.nav_path || "/lovelace/cameras";

    history.pushState(null, "", path);
    window.dispatchEvent(new CustomEvent("location-changed", {
      bubbles: true,
      composed: true,
      detail: { replace: false },
    }));
  }

  _css() {
    const c = this._config;
    const dark = this._isDark();

    const bg = dark ? c.night_bg : c.day_bg;
    const border = dark ? c.night_border : c.day_border;
    const nameCol = dark ? c.night_name : c.day_name;
    const iconFrom = dark ? c.night_icon_from : c.day_icon_from;
    const iconTo = dark ? c.night_icon_to : c.day_icon_to;
    const iconCol = dark ? c.night_icon_col : "#ffffff";
    const spark = dark ? "rgba(251,113,133,0.85)" : "rgba(251,113,133,0.55)";
    const wave = dark ? "rgba(244,63,94,0.22)" : "rgba(244,63,94,0.14)";

    return `
      *{
        box-sizing:border-box;
        margin:0;
        padding:0;
      }

      :host{
        display:block;
      }

      .card{
        position:relative;
        overflow:hidden;
        border-radius:18px;
        padding:16px;
        min-height:90px;
        display:flex;
        align-items:center;
        gap:14px;
        cursor:pointer;
        user-select:none;
        transition:transform .15s ease, box-shadow .15s ease;
        will-change:transform;
        background:${bg};
        border:1px solid ${border};
      }

      .card:hover{
        transform:translateY(-2px);
      }

      .card:active{
        transform:scale(.96);
      }

      .orb{
        width:44px;
        height:44px;
        border-radius:50%;
        flex-shrink:0;
        display:flex;
        align-items:center;
        justify-content:center;
        background:linear-gradient(135deg,${iconFrom},${iconTo});
        ${dark
          ? "box-shadow:0 0 14px rgba(244,63,94,.4);border:1px solid rgba(244,63,94,.3)"
          : "box-shadow:0 4px 12px rgba(244,63,94,.25)"};
      }

      .orb svg{
        color:${iconCol};
        ${dark ? "filter:drop-shadow(0 0 3px rgba(251,113,133,.8));animation:scan 3.8s ease-in-out infinite alternate" : ""};
        transform-origin:center 80%;
      }

      @keyframes scan{
        0%{transform:rotate(-16deg)}
        100%{transform:rotate(16deg)}
      }

      .txt{
        flex:1;
        min-width:0;
        z-index:1;
      }

      .name{
        font-size:15px;
        font-weight:800;
        letter-spacing:.3px;
        color:${nameCol};
        direction:rtl;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }

      .sparks{
        position:absolute;
        inset:0;
        pointer-events:none;
        border-radius:18px;
        background:
          radial-gradient(circle at 12% 92%,${spark} 0%,transparent 7%),
          radial-gradient(circle at 32% 96%,${spark} 0%,transparent 5%),
          radial-gradient(circle at 58% 90%,${spark} 0%,transparent 6%),
          radial-gradient(circle at 82% 94%,${spark} 0%,transparent 5%);
        animation:sparks 3s ease-in-out infinite alternate;
      }

      @keyframes sparks{
        0%{opacity:.4;transform:translateY(0)}
        100%{opacity:1;transform:translateY(-4px)}
      }

      .wave{
        position:absolute;
        left:0;
        right:0;
        bottom:0;
        height:18px;
        background:${wave};
        border-radius:0 0 18px 18px;
        clip-path:polygon(
          0% 60%,5% 40%,10% 20%,15% 40%,20% 60%,
          25% 80%,30% 60%,35% 40%,40% 20%,45% 40%,
          50% 60%,55% 80%,60% 60%,65% 40%,70% 20%,
          75% 40%,80% 60%,85% 80%,90% 60%,95% 40%,
          100% 20%,100% 100%,0% 100%
        );
        animation:wave 2.5s ease-in-out infinite alternate;
      }

      @keyframes wave{
        0%{transform:scaleY(.7) translateY(2px);opacity:.7}
        100%{transform:scaleY(1.2) translateY(0);opacity:1}
      }
    `;
  }

  _camIcon() {
    return `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="1" y="7" width="15" height="10" rx="2"></rect>
        <path d="M16 10l6-3v10l-6-3V10z"></path>
        <circle cx="7.5" cy="12" r="2"></circle>
      </svg>
    `;
  }

  _render() {
    const c = this._config;

    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <div class="card" id="card" role="button" tabindex="0" aria-label="${c.name}">
        <div class="sparks"></div>
        <div class="wave"></div>
        <div class="orb">${this._camIcon()}</div>
        <div class="txt">
          <div class="name">${c.name}</div>
        </div>
      </div>
    `;

    const card = this.shadowRoot.getElementById("card");

    card.addEventListener("click", () => this._navigate());

    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        this._navigate();
      }
    });
  }

  getCardSize() {
    return 1;
  }

  static getConfigElement() {
    return document.createElement("ember-rose-card-editor");
  }

  static getStubConfig() {
    return {
      name: "מצלמות",
      nav_path: "/lovelace/cameras",
      tap_action: {
        action: "navigate",
        navigation_path: "/lovelace/cameras",
      },
    };
  }
}

class EmberRoseCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = {
      name: "מצלמות",
      nav_path: "/lovelace/cameras",
      day_bg: "#fff1f2",
      day_border: "#fda4af",
      day_name: "#4c0519",
      day_icon_from: "#fb7185",
      day_icon_to: "#f43f5e",
      night_bg: "#100008",
      night_border: "rgba(244,63,94,0.22)",
      night_name: "#ffe4e6",
      night_icon_from: "#4c0519",
      night_icon_to: "#881337",
      night_icon_col: "#fda4af",
      ...config,
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _schema() {
    return [
      {
        name: "name",
        label: "שם הכרטיס",
        selector: { text: {} },
      },
      {
        name: "nav_path",
        label: "נתיב ניווט",
        selector: { text: {} },
      },
      {
        name: "day_bg",
        label: "רקע יום",
        selector: { color_rgb: {} },
      },
      {
        name: "day_border",
        label: "מסגרת יום",
        selector: { color_rgb: {} },
      },
      {
        name: "day_name",
        label: "צבע טקסט יום",
        selector: { color_rgb: {} },
      },
      {
        name: "day_icon_from",
        label: "צבע אייקון יום - התחלה",
        selector: { color_rgb: {} },
      },
      {
        name: "day_icon_to",
        label: "צבע אייקון יום - סוף",
        selector: { color_rgb: {} },
      },
      {
        name: "night_bg",
        label: "רקע לילה",
        selector: { color_rgb: {} },
      },
      {
        name: "night_border",
        label: "מסגרת לילה",
        selector: { text: {} },
      },
      {
        name: "night_name",
        label: "צבע טקסט לילה",
        selector: { color_rgb: {} },
      },
      {
        name: "night_icon_from",
        label: "צבע אייקון לילה - התחלה",
        selector: { color_rgb: {} },
      },
      {
        name: "night_icon_to",
        label: "צבע אייקון לילה - סוף",
        selector: { color_rgb: {} },
      },
      {
        name: "night_icon_col",
        label: "צבע אייקון לילה",
        selector: { color_rgb: {} },
      },
    ];
  }

  _valueChanged(event) {
    const newConfig = {
      ...this._config,
      ...event.detail.value,
    };

    newConfig.tap_action = {
      action: "navigate",
      navigation_path: newConfig.nav_path || "/lovelace/cameras",
    };

    this._config = newConfig;

    this.dispatchEvent(new CustomEvent("config-changed", {
      bubbles: true,
      composed: true,
      detail: { config: newConfig },
    }));
  }

  _render() {
    if (!this._hass || !this._config) return;

    this.innerHTML = "";

    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this._config;
    form.schema = this._schema();
    form.computeLabel = (schema) => schema.label || schema.name;

    form.addEventListener("value-changed", (event) => this._valueChanged(event));

    this.appendChild(form);
  }
}

customElements.define("ember-rose-card", EmberRoseCard);
customElements.define("ember-rose-card-editor", EmberRoseCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "ember-rose-card",
  name: "Ember Rose Card",
  description: "כרטיס ניווט מעוצב למסך מצלמות עם עורך UI תקני ל־Home Assistant",
  preview: true,
});
