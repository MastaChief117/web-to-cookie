# 🍪 CookieHost V1

> Why host a website normally when you can put it in cookies?

Experimental static app: pick a tiny text-only site → the browser packages it → gzip-compresses it when available → Base64URL-encodes it → stores the result in cookie chunks → `/loadsite` reconstructs it in a sandboxed iframe.

**Important:** cookies are sent automatically with matching HTTP requests. CookieHost therefore does **not** provide a zero-network/privacy guarantee. The cookie mode is deliberately small and capped at 64 KiB of encoded payload.

## Run

```bash
npm start
# builder → http://localhost:3000/builder
# loader  → http://localhost:3000/loadsite
```

No runtime npm dependencies. Node ≥ 18.

## Limits

- Text only: `.html .htm .css .js .json .txt .svg`
- 3000-character cookie chunks
- Maximum encoded cookie payload: 64 KiB
- Cookies use `Path=/; SameSite=Strict; Max-Age=1 year`
- JavaScript in baked sites executes inside a sandboxed iframe with scripts enabled and same-origin disabled.
- Cookie mode is intentionally a cursed demo, not normal hosting.

## Privacy

If you need the website data to stay client-side without being automatically attached to HTTP requests, **do not use cookies**. Use IndexedDB or localStorage instead. Browsers automatically include matching cookies in the `Cookie` request header; `SameSite` controls cross-site sending, not same-site sending. 

## Test

1. Open `/builder`.
2. Use **Pick files** or **Pick folder**.
3. Bake → Open Website.
4. Test styling and JavaScript.
5. Try corrupted/missing cookies, unsupported files, nested folders, and oversized sites.
