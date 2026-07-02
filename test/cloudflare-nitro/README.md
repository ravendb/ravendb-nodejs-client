# Nitro / TanStack Start Cloudflare example + tests

TanStack Start deploys to Cloudflare through [Nitro](https://nitro.build) (Rollup + `unenv`).
This project mirrors that toolchain and doubles as the RDBC-1083 regression coverage.

`ravendb` is resolved from the repo root (`file:../..`), so it tests the locally built client.
`wrangler.toml` sets `nodejs_compat` so Nitro defers `node:` built-ins to workerd instead of
`unenv` stubs (required for `node:stream` — see the "Cloudflare Workers" section of the top-level
`readme.md`).

## Load test (no server)

```bash
npm ci                 # from the repo root, builds the client
cd test/cloudflare-nitro
npm install
npm run build
npm run smoke          # boots the built worker in workerd, asserts the client loads
```

## End-to-end test (needs a RavenDB server)

Start an (insecure) RavenDB on `http://127.0.0.1:8080`, then:

```bash
npm run build
RAVENDB_URL=http://127.0.0.1:8080 npm run e2e   # stores + loads a document from inside workerd
```
