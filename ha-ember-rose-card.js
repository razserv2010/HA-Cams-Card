type: custom:button-card
name: מצלמות
tap_action:
  action: navigate
  navigation_path: /lovelace/Cams

# ╔══════════════════════════════════════════╗
# ║         הגדרות — שנה כאן בלבד           ║
# ╚══════════════════════════════════════════╝
variables:
  cam_name: מצלמות          # שם הכרטיס
  cam_count: 4               # מספר מצלמות פעילות
  nav_path: /lovelace/Cams   # נתיב ניווט

  # צבעי יום
  day_bg:        "#fff1f2"
  day_border:    "#fda4af"
  day_name:      "#4c0519"
  day_sub:       "#be123c"
  day_icon_from: "#fb7185"
  day_icon_to:   "#f43f5e"
  day_spark:     "rgba(251,113,133,0.6)"
  day_wave:      "rgba(244,63,94,0.15)"

  # צבעי לילה
  night_bg:        "#100008"
  night_border:    "rgba(244,63,94,0.2)"
  night_name:      "#ffe4e6"
  night_sub:       "rgba(251,113,133,0.45)"
  night_icon_from: "#4c0519"
  night_icon_to:   "#881337"
  night_icon_col:  "#fda4af"
  night_spark:     "rgba(251,113,133,0.8)"
  night_wave:      "rgba(244,63,94,0.2)"

label: >
  [[[ return variables.cam_count + ' פעילות · Ember'; ]]]

icon: mdi:cctv

extra_styles: >
  .button-card-main {
    border-radius: 18px !important;
    overflow: hidden !important;
    padding: 16px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
    position: relative !important;
    min-height: 90px !important;
    cursor: pointer !important;
    transition: transform .15s !important;
    background: [[[ return variables.day_bg ]]] !important;
    border: 1px solid [[[ return variables.day_border ]]] !important;
    box-shadow: none !important;
  }
  @media (prefers-color-scheme: dark) {
    .button-card-main {
      background: [[[ return variables.night_bg ]]] !important;
      border-color: [[[ return variables.night_border ]]] !important;
    }
  }
  .button-card-main:active { transform: scale(.96) !important; }

  ha-icon, .icon {
    color: #ffffff !important;
    --mdc-icon-size: 22px !important;
    transform-origin: center 80% !important;
  }
  @media (prefers-color-scheme: dark) {
    ha-icon, .icon {
      color: [[[ return variables.night_icon_col ]]] !important;
      filter: drop-shadow(0 0 3px rgba(251,113,133,.8)) !important;
      animation: camscan 3.8s ease-in-out infinite alternate !important;
    }
  }
  @keyframes camscan {
    0%   { transform: rotate(-16deg); }
    100% { transform: rotate(16deg);  }
  }

  .icon-wrapper {
    width: 40px !important;
    height: 40px !important;
    border-radius: 50% !important;
    background: linear-gradient(135deg,
      [[[ return variables.day_icon_from ]]],
      [[[ return variables.day_icon_to ]]]
    ) !important;
    box-shadow: 0 4px 12px rgba(244,63,94,.25) !important;
  }
  @media (prefers-color-scheme: dark) {
    .icon-wrapper {
      background: linear-gradient(135deg,
        [[[ return variables.night_icon_from ]]],
        [[[ return variables.night_icon_to ]]]
      ) !important;
      border: 1px solid rgba(244,63,94,.3) !important;
      box-shadow: 0 0 14px rgba(244,63,94,.35) !important;
    }
  }

  .name {
    font-size: 15px !important;
    font-weight: 800 !important;
    letter-spacing: .3px !important;
    color: [[[ return variables.day_name ]]] !important;
  }
  @media (prefers-color-scheme: dark) {
    .name { color: [[[ return variables.night_name ]]] !important; }
  }

  .label {
    font-size: 11px !important;
    color: [[[ return variables.day_sub ]]] !important;
  }
  @media (prefers-color-scheme: dark) {
    .label { color: [[[ return variables.night_sub ]]] !important; }
  }

  .button-card-main::before {
    content: '' !important;
    position: absolute !important;
    inset: 0 !important;
    pointer-events: none !important;
    background:
      radial-gradient(circle at 15% 90%, [[[ return variables.day_spark ]]] 0%, transparent 8%),
      radial-gradient(circle at 35% 95%, [[[ return variables.day_spark ]]] 0%, transparent 6%),
      radial-gradient(circle at 60% 88%, [[[ return variables.day_spark ]]] 0%, transparent 7%),
      radial-gradient(circle at 80% 93%, [[[ return variables.day_spark ]]] 0%, transparent 5%);
    animation: sparkshift 3s ease-in-out infinite alternate !important;
    border-radius: 18px !important;
  }
  @media (prefers-color-scheme: dark) {
    .button-card-main::before {
      background:
        radial-gradient(circle at 15% 90%, [[[ return variables.night_spark ]]] 0%, transparent 8%),
        radial-gradient(circle at 35% 95%, [[[ return variables.night_spark ]]] 0%, transparent 6%),
        radial-gradient(circle at 60% 88%, [[[ return variables.night_spark ]]] 0%, transparent 7%),
        radial-gradient(circle at 80% 93%, [[[ return variables.night_spark ]]] 0%, transparent 5%);
    }
  }
  @keyframes sparkshift {
    0%   { opacity: .4; transform: translateY(0);   }
    100% { opacity: 1;  transform: translateY(-4px); }
  }

  .button-card-main::after {
    content: '' !important;
    position: absolute !important;
    left: 0; right: 0; bottom: 0 !important;
    height: 18px !important;
    background: [[[ return variables.day_wave ]]] !important;
    border-radius: 0 0 18px 18px !important;
    clip-path: polygon(
      0% 60%, 5% 40%, 10% 20%, 15% 40%, 20% 60%,
      25% 80%, 30% 60%, 35% 40%, 40% 20%, 45% 40%,
      50% 60%, 55% 80%, 60% 60%, 65% 40%, 70% 20%,
      75% 40%, 80% 60%, 85% 80%, 90% 60%, 95% 40%,
      100% 20%, 100% 100%, 0% 100%
    ) !important;
    animation: wavebreath 2.5s ease-in-out infinite alternate !important;
  }
  @media (prefers-color-scheme: dark) {
    .button-card-main::after {
      background: [[[ return variables.night_wave ]]] !important;
    }
  }
  @keyframes wavebreath {
    0%   { transform: scaleY(.7) translateY(2px); opacity: .7; }
    100% { transform: scaleY(1.2) translateY(0);  opacity: 1;  }
  }

styles:
  card:
    - background: none
    - box-shadow: none
    - border-radius: 0
    - padding: 0
  name:
    - font-weight: "800"
    - font-size: 15px
    - letter-spacing: 0.3px
  label:
    - font-size: 11px
    - justify-self: start
  icon:
    - width: 22px
    - height: 22px
  grid:
    - grid-template-areas: '"i n" "i l"'
    - grid-template-columns: min-content 1fr
    - grid-template-rows: min-content min-content
    - align-items: center
    - gap: "0 12px"
