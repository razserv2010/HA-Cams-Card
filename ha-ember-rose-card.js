class EmberRoseCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
    this._pressTimer = null;
    this._popupOpen = false;
  }

  setConfig(config) {
    this._config = {
      name: config.name || 'מצלמות',
      cam_count: config.cam_count || 4,
      nav_path: config.nav_path || '/lovelace/cameras',
      day_bg: config.day_bg || '#fff1f2',
      day_border: config.day_border || '#fda4af',
      day_name: config.day_name || '#4c0519',
      day_sub: config.day_sub || '#be123c',
      day_icon_from: config.day_icon_from || '#fb7185',
      day_icon_to: config.day_icon_to || '#f43f5e',
      night_bg: config.night_bg || '#100008',
      night_border: config.night_border || 'rgba(244,63,94,0.22)',
      night_name: config.night_name || '#ffe4e6',
      night_sub: config.night_sub || 'rgba(251,113,133,0.5)',
      night_icon_from: config.night_icon_from || '#4c0519',
      night_icon_to: config.night_icon_to || '#881337',
      night_icon_col: config.night_icon_col || '#fda4af',
      ...config,
    };
    this._saved = { ...this._config };
    this._render();
  }

  connectedCallback() { this._render(); }

  _isDark() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  _css() {
    const c = this._config;
    const dark = this._isDark();
    const bg          = dark ? c.night_bg         : c.day_bg;
    const border      = dark ? c.night_border      : c.day_border;
    const nameCol     = dark ? c.night_name        : c.day_name;
    const subCol      = dark ? c.night_sub         : c.day_sub;
    const iconFrom    = dark ? c.night_icon_from   : c.day_icon_from;
    const iconTo      = dark ? c.night_icon_to     : c.day_icon_to;
    const iconCol     = dark ? c.night_icon_col    : '#ffffff';
    const spark       = dark ? 'rgba(251,113,133,0.85)' : 'rgba(251,113,133,0.55)';
    const wave        = dark ? 'rgba(244,63,94,0.22)'   : 'rgba(244,63,94,0.14)';

    return `
      *{box-sizing:border-box;margin:0;padding:0}
      :host{display:block}

      /* ── CARD ── */
      .card{
        position:relative;overflow:hidden;
        border-radius:18px;
        padding:16px;
        min-height:90px;
        display:flex;align-items:center;gap:14px;
        cursor:pointer;
        user-select:none;
        transition:transform .15s;
        background:${bg};
        border:1px solid ${border};
      }
      .card:active{transform:scale(.96)}

      /* ── ICON ── */
      .orb{
        width:44px;height:44px;border-radius:50%;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;
        background:linear-gradient(135deg,${iconFrom},${iconTo});
        ${dark ? `box-shadow:0 0 14px rgba(244,63,94,.4);border:1px solid rgba(244,63,94,.3)` : `box-shadow:0 4px 12px rgba(244,63,94,.25)`};
      }
      .orb svg{
        color:${iconCol};
        ${dark ? 'filter:drop-shadow(0 0 3px rgba(251,113,133,.8));animation:scan 3.8s ease-in-out infinite alternate' : ''};
        transform-origin:center 80%;
      }
      @keyframes scan{0%{transform:rotate(-16deg)}100%{transform:rotate(16deg)}}

      /* ── TEXT ── */
      .txt{flex:1}
      .name{font-size:15px;font-weight:800;letter-spacing:.3px;color:${nameCol};direction:rtl}
      .sub{font-size:11px;margin-top:3px;color:${subCol};direction:rtl}

      /* ── SPARKS ── */
      .sparks{position:absolute;inset:0;pointer-events:none;border-radius:18px;
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

      /* ── WAVE ── */
      .wave{
        position:absolute;left:0;right:0;bottom:0;height:18px;
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

      /* ── HOLD HINT ── */
      .hint{
        position:absolute;top:8px;left:10px;
        font-size:9px;letter-spacing:.4px;opacity:.35;
        color:${nameCol};font-family:monospace;
      }

      /* ── POPUP OVERLAY ── */
      .overlay{
        position:fixed;inset:0;z-index:9999;
        background:rgba(0,0,0,.55);
        display:flex;align-items:center;justify-content:center;
        animation:fadein .2s ease;
      }
      @keyframes fadein{from{opacity:0}to{opacity:1}}

      /* ── POPUP PANEL ── */
      .popup{
        background:${dark ? '#1a0a10' : '#fff'};
        border:1px solid ${dark ? 'rgba(244,63,94,.25)' : '#fda4af'};
        border-radius:20px;
        padding:24px 22px 20px;
        width:320px;
        max-width:92vw;
        box-shadow:0 20px 60px rgba(0,0,0,.4);
        animation:slidein .22s ease;
        direction:rtl;
      }
      @keyframes slidein{from{transform:translateY(16px);opacity:0}to{transform:translateY(0);opacity:1}}

      .popup-title{
        font-size:15px;font-weight:800;margin-bottom:20px;
        color:${dark ? '#ffe4e6' : '#4c0519'};
        display:flex;align-items:center;gap:8px;
      }
      .popup-title svg{flex-shrink:0}

      .field{margin-bottom:16px}
      .field label{
        display:block;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:5px;
        color:${dark ? 'rgba(251,113,133,.6)' : '#be123c'};
      }
      .field input[type=text]{
        width:100%;padding:8px 12px;border-radius:10px;font-size:13px;
        border:1px solid ${dark ? 'rgba(244,63,94,.25)' : '#fda4af'};
        background:${dark ? 'rgba(255,255,255,.04)' : '#fff9fa'};
        color:${dark ? '#ffe4e6' : '#4c0519'};
        outline:none;transition:border-color .2s;
        direction:rtl;
      }
      .field input[type=text]:focus{border-color:${dark ? '#fb7185' : '#f43f5e'}}

      .color-row{display:flex;gap:10px}
      .color-item{flex:1;display:flex;flex-direction:column;gap:4px}
      .color-item label{font-size:10px;font-weight:700;letter-spacing:.4px;color:${dark ? 'rgba(251,113,133,.5)' : '#be123c'}}
      .color-item input[type=color]{
        width:100%;height:32px;border-radius:8px;border:1px solid ${dark ? 'rgba(244,63,94,.2)' : '#fda4af'};
        background:none;cursor:pointer;padding:2px;
      }

      .popup-actions{display:flex;gap:10px;margin-top:20px}
      .btn{
        flex:1;padding:9px;border-radius:12px;font-size:13px;font-weight:700;
        cursor:pointer;border:none;transition:transform .1s,opacity .1s;letter-spacing:.3px;
      }
      .btn:active{transform:scale(.97)}
      .btn-save{
        background:linear-gradient(135deg,#fb7185,#f43f5e);
        color:#fff;
      }
      .btn-cancel{
        background:${dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)'};
        color:${dark ? '#ffe4e6' : '#4c0519'};
      }
    `;
  }

  _camIcon() {
    return `<svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="7" width="15" height="10" rx="2"/>
      <path d="M16 10l6-3v10l-6-3V10z"/>
      <circle cx="7.5" cy="12" r="2"/>
    </svg>`;
  }

  _settingsIcon() {
    return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
      style="color:#fb7185">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>`;
  }

  _render() {
    const c = this._config;
    this.shadowRoot.innerHTML = `
      <style>${this._css()}</style>
      <div class="card" id="card">
        <div class="sparks"></div>
        <div class="wave"></div>
        <span class="hint">hold · הגדרות</span>
        <div class="orb">${this._camIcon()}</div>
        <div class="txt">
          <div class="name">${c.name}</div>
          <div class="sub">${c.cam_count} פעילות · Ember</div>
        </div>
      </div>
    `;
    this._bindEvents();

    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', () => this._render());
  }

  _bindEvents() {
    const card = this.shadowRoot.getElementById('card');

    card.addEventListener('mousedown', () => this._startHold());
    card.addEventListener('touchstart', () => this._startHold(), { passive: true });
    card.addEventListener('mouseup', () => this._endHold(false));
    card.addEventListener('touchend', () => this._endHold(false));
    card.addEventListener('mouseleave', () => this._cancelHold());
    card.addEventListener('touchcancel', () => this._cancelHold());

    card.addEventListener('click', () => {
      if (!this._wasHold) {
        history.pushState(null, '', this._config.nav_path);
        window.dispatchEvent(new PopStateEvent('popstate'));
        const ev = new CustomEvent('location-changed', { bubbles: true, composed: true });
        this.dispatchEvent(ev);
      }
      this._wasHold = false;
    });
  }

  _startHold() {
    this._wasHold = false;
    this._pressTimer = setTimeout(() => {
      this._wasHold = true;
      this._openPopup();
    }, 600);
  }

  _endHold() {
    clearTimeout(this._pressTimer);
  }

  _cancelHold() {
    clearTimeout(this._pressTimer);
  }

  _openPopup() {
    if (this._popupOpen) return;
    this._popupOpen = true;
    const dark = this._isDark();
    const c = this._config;

    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.innerHTML = `
      <div class="popup">
        <div class="popup-title">
          ${this._settingsIcon()}
          הגדרות כרטיס
        </div>

        <div class="field">
          <label>שם הכרטיס</label>
          <input type="text" id="cfg-name" value="${c.name}" placeholder="מצלמות" />
        </div>

        <div class="field">
          <label>מספר מצלמות</label>
          <input type="text" id="cfg-count" value="${c.cam_count}" placeholder="4" />
        </div>

        <div class="field">
          <label>נתיב ניווט</label>
          <input type="text" id="cfg-path" value="${c.nav_path}" placeholder="/lovelace/cameras" dir="ltr" style="direction:ltr;text-align:left" />
        </div>

        <div class="field">
          <label>צבעי יום</label>
          <div class="color-row">
            <div class="color-item">
              <label>רקע</label>
              <input type="color" id="cfg-day-bg" value="${c.day_bg}" />
            </div>
            <div class="color-item">
              <label>אייקון מ</label>
              <input type="color" id="cfg-day-from" value="${c.day_icon_from}" />
            </div>
            <div class="color-item">
              <label>אייקון ל</label>
              <input type="color" id="cfg-day-to" value="${c.day_icon_to}" />
            </div>
          </div>
        </div>

        <div class="field">
          <label>צבעי לילה</label>
          <div class="color-row">
            <div class="color-item">
              <label>רקע</label>
              <input type="color" id="cfg-night-bg" value="${c.night_bg.startsWith('rgba') ? '#100008' : c.night_bg}" />
            </div>
            <div class="color-item">
              <label>אייקון מ</label>
              <input type="color" id="cfg-night-from" value="${c.night_icon_from}" />
            </div>
            <div class="color-item">
              <label>אייקון ל</label>
              <input type="color" id="cfg-night-to" value="${c.night_icon_to}" />
            </div>
          </div>
        </div>

        <div class="popup-actions">
          <button class="btn btn-save" id="btn-save">שמור</button>
          <button class="btn btn-cancel" id="btn-cancel">ביטול</button>
        </div>
      </div>
    `;

    this.shadowRoot.appendChild(overlay);

    overlay.querySelector('#btn-cancel').addEventListener('click', () => this._closePopup());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) this._closePopup(); });

    overlay.querySelector('#btn-save').addEventListener('click', () => {
      this._config.name         = overlay.querySelector('#cfg-name').value || c.name;
      this._config.cam_count    = overlay.querySelector('#cfg-count').value || c.cam_count;
      this._config.nav_path     = overlay.querySelector('#cfg-path').value || c.nav_path;
      this._config.day_bg       = overlay.querySelector('#cfg-day-bg').value;
      this._config.day_icon_from= overlay.querySelector('#cfg-day-from').value;
      this._config.day_icon_to  = overlay.querySelector('#cfg-day-to').value;
      this._config.night_bg     = overlay.querySelector('#cfg-night-bg').value;
      this._config.night_icon_from = overlay.querySelector('#cfg-night-from').value;
      this._config.night_icon_to   = overlay.querySelector('#cfg-night-to').value;
      this._closePopup();
      this._render();
    });
  }

  _closePopup() {
    const overlay = this.shadowRoot.querySelector('.overlay');
    if (overlay) overlay.remove();
    this._popupOpen = false;
  }

  getCardSize() { return 1; }

  static getConfigElement() { return document.createElement('ember-rose-card-editor'); }
  static getStubConfig() {
    return { name: 'מצלמות', cam_count: 4, nav_path: '/lovelace/cameras' };
  }
}

customElements.define('ember-rose-card', EmberRoseCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'ember-rose-card',
  name: 'Ember Rose Card',
  description: 'כרטיס מצלמות עם אנימציות ניצוצות וגל, מצב יום/לילה, הגדרות בקליק ארוך',
  preview: true,
});
