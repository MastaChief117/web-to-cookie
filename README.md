# 🍪 CookieHost V1

> Why host a website normally when you can put it in cookies?

Experimental app: upload a tiny text-only site → browser gzips → base64url → splits into `cookiehost_0000…` chunks → `/loadsite` rebuilds it in an isolated iframe. Server stores nothing.

## Run

```bash
npm start
# builder → http://localhost:3000/builder
# loader  → http://localhost:3000/loadsite
```

No dependencies. Node ≥ 18 (uses only `http`/`fs`/`path`; browser uses `CompressionStream`).

## Limits (V1)

- Text only: `.html .htm .css .js .json .txt .svg`
- Chunk: 3000 chars/cookie, `Path=/; SameSite=Lax; 1yr`
- Expect ~300–500KB usable. Every request carries your site. Deliciously inefficient.
- JS in baked sites *will execute* in the iframe (`allow-scripts`, no `allow-same-origin`).

## Test

1. Open `/builder`, pick the `test-site/` folder (or files).
2. Bake → Open Website → click CLICK ME (JS works), check styling.
3. Try: no cookies, corrupted cookie, unsupported file (add a .png), huge site, no index.html, external `https://example.com/test.js` stays external.
