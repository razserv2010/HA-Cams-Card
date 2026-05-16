# 🔴 Ember Rose — Home Assistant Camera Card

כרטיס מותאם אישית לדף המצלמות עם אנימציות ייחודיות.

## תכונות
- ניצוצות עולים מהתחתית
- גל פועם בבסיס הכרטיס
- אנימציית סריקה על האייקון (במצב לילה)
- מצב יום ולילה אוטומטי לפי `prefers-color-scheme`
- לחיצה מנווטת ל־`/lovelace/Cams`

## דרישות
- [button-card](https://github.com/custom-cards/button-card) מותקן דרך HACS

## התקנה

הדבק את תוכן `ember-rose-card.yaml` ישירות ב-Lovelace ב-Raw Editor:

```yaml
type: custom:button-card
name: מצלמות
tap_action:
  action: navigate
  navigation_path: /lovelace/Cams
# ... (ראה ember-rose-card.yaml)
```

## צבעים

| מצב | רקע | גבול | שם | אייקון |
|-----|-----|------|----|--------|
| יום | `#fff1f2` | `#fda4af` | `#4c0519` | לבן על gradient ורוד |
| לילה | `#100008` | `rgba(244,63,94,.2)` | `#ffe4e6` | `#fda4af` עם glow |

## שינוי נתיב ניווט

שנה את `navigation_path` לנתיב שלך:
```yaml
tap_action:
  action: navigate
  navigation_path: /lovelace/YOUR_VIEW
```
