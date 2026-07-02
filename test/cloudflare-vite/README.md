# Vite + Cloudflare example + load test

Vite/Rollup build via [`@cloudflare/vite-plugin`](https://developers.cloudflare.com/workers/vite-plugin/),
one of the toolchains used to deploy to Cloudflare Workers. Doubles as RDBC-1083 load coverage.

`ravendb` is resolved from the repo root (`file:../..`), so it tests the locally built client.

```bash
npm ci                 # from the repo root, builds the client
cd test/cloudflare-vite
npm install
npm run build
npm run smoke          # boots the Vite-built worker in workerd, asserts the client loads
```
