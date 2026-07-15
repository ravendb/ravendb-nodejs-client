// End-to-end test: boots the built Nitro worker in workerd and performs a real
// store + load against a RavenDB server (default http://127.0.0.1:8080, override
// with RAVENDB_URL). Run after `npm run build` with a RavenDB server available.
import { unstable_dev } from "wrangler";

const ravenUrl = process.env.RAVENDB_URL || "http://127.0.0.1:8080";

const worker = await unstable_dev(".output/server/index.mjs", {
    experimental: { disableExperimentalWarning: true },
    compatibilityDate: "2024-12-30",
    compatibilityFlags: ["nodejs_compat"],
    logLevel: "warn"
});

try {
    const res = await worker.fetch("/e2e?url=" + encodeURIComponent(ravenUrl));
    const body = await res.json();
    if (res.status !== 200 || !body.ok) {
        console.error(`E2E FAILED [HTTP ${res.status}]: ${JSON.stringify(body)}`);
        process.exitCode = 1;
    } else {
        console.log(`E2E OK: ${JSON.stringify(body)}`);
    }
} finally {
    await worker.stop();
}
