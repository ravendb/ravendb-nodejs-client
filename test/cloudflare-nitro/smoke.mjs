// Load smoke test: boots the built Nitro worker in workerd and asserts the
// RavenDB client module graph loads (no server needed). Run after `npm run build`.
import { unstable_dev } from "wrangler";

const worker = await unstable_dev(".output/server/index.mjs", {
    experimental: { disableExperimentalWarning: true },
    compatibilityDate: "2024-12-30",
    compatibilityFlags: ["nodejs_compat"],
    logLevel: "warn"
});

try {
    const res = await worker.fetch("/load");
    const body = await res.json();
    if (res.status !== 200 || !body.ok) {
        console.error(`SMOKE FAILED [HTTP ${res.status}]: ${JSON.stringify(body)}`);
        process.exitCode = 1;
    } else {
        console.log(`SMOKE OK: ${JSON.stringify(body)}`);
    }
} finally {
    await worker.stop();
}
