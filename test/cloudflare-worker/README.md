# Cloudflare Workers load smoke test

Minimal [Cloudflare Workers](https://developers.cloudflare.com/workers/) project that
imports the RavenDB client and constructs a `DocumentStore` inside a real `workerd`
instance. It guards against [RDBC-1083](https://issues.hibernatingrhinos.com/issue/RDBC-1083)
— a module-graph / bundler-interop load crash (`Class extends value [object Module]
is not a constructor or null`).

It resolves `ravendb` from the repository root (`file:../..`), so it always tests the
locally built client, including the `workerd`/`worker` export conditions.

## Run it

```bash
# from the repository root: build the client first
npm ci

# then run the smoke test
cd test/cloudflare-worker
npm install
npm run smoke
```

`npm run smoke` boots the worker via wrangler's programmatic API, sends one request,
and exits non-zero unless the client loaded and a `DocumentStore` was constructed.

For interactive debugging use `npx wrangler dev` and open the printed URL.

This is a **load** test only — it does not talk to a RavenDB server. For the mTLS
recipe (talking to a secure RavenDB from a Worker) see the "Cloudflare Workers"
section of the top-level `readme.md`.
