// Non-interactive Cloudflare Workers load smoke test for CI (RDBC-1083).
//
// Boots the worker in a real workerd instance via wrangler's programmatic API,
// hits it once, and asserts the RavenDB client loaded and a DocumentStore was
// constructed. Exits non-zero on any failure so CI fails loudly if a future
// change reintroduces a bundler-interop / module-graph load crash.
import { unstable_dev } from "wrangler";

const worker = await unstable_dev("src/worker.ts", {
    experimental: { disableExperimentalWarning: true },
    logLevel: "warn"
});

try {
    for (const path of ["/", "/initialize-mtls"]) {
        const res = await worker.fetch(path);
        const text = await res.text();

        if (res.status !== 200 || !text.startsWith("ok:")) {
            console.error(`SMOKE FAILED [${path}] [HTTP ${res.status}]: ${text}`);
            process.exitCode = 1;
        } else {
            console.log(`SMOKE OK [${path}]: ${text}`);
        }
    }
} finally {
    await worker.stop();
}
