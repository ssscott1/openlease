# Translation status

All public-facing copy lives in `/messages/{locale}.json` — components contain
no hard-coded strings. English (`en.json`) is the source of truth; every other
file must contain exactly the same keys.

| Locale | Language | Status |
| --- | --- | --- |
| `en` | English | ✅ Source |
| `zh-CN` | Mandarin (Simplified) | ⚠️ DRAFT — machine-assisted, **needs professional review before launch** |
| `zh-HK` | Cantonese (Traditional, HK) | ⚠️ DRAFT — machine-assisted, **needs professional review before launch** |
| `ar` | Arabic (MSA) | ⚠️ DRAFT — machine-assisted, **needs professional review before launch** |
| `pa` | Punjabi (Gurmukhi) | ⚠️ DRAFT — machine-assisted, **needs professional review before launch** |

Each draft file carries a `_meta.status` marker. Do **not** remove it until a
professional translator has signed off on the file.

## Rules for translators

- Keep ICU placeholders (`{count}`, `{min}`, `{max}`, `{km}`, `{rate}`,
  `{months}`, `{vehicle}`, `{price}`, `{year}`, `{value}`) exactly as-is.
- Currency is always AUD and is formatted by code — never write currency
  symbols into translations.
- Visa subclass numbers (482, 485, …) and the brand name "OpenLease" stay
  in Latin script.
- Arabic renders full RTL automatically (`dir="rtl"` + logical CSS
  properties); translate naturally, the layout mirrors itself.

## Checking key parity

```bash
node scripts/check-messages.mjs
```
