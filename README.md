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

The Cloudflare API token should include Cloudflare Pages edit access for the account. After creating the token in Cloudflare, add both secrets in GitHub under:

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

Or from this project folder:

```bash
gh secret set CLOUDFLARE_API_TOKEN --repo wamaral19/strokesgame
gh secret set CLOUDFLARE_ACCOUNT_ID --repo wamaral19/strokesgame
```

Create the Cloudflare Pages project once, using `strokesgame` as the project name and `main` as the production branch. Then add `strokesgame.com` as a custom domain for that Pages project in Cloudflare.
