# Strokes Game

Next.js app for strokesgame.com.

## Local development

```bash
npm install
npm run dev
```

## Deployment

Pushes to `main` build a static export and deploy `out/` to the Cloudflare Pages project named `strokesgame`.

The GitHub repository needs these Actions secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The Cloudflare API token should include Cloudflare Pages edit access for the account.
