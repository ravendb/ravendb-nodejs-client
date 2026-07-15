// Load smoke test: boots the Vite/Rollup-built worker in workerd and asserts the
// RavenDB client module graph loads. Run after `npm run build`.
import { unstable_dev } from "wrangler";

const worker = await unstable_dev("dist/ravendb_vite_cf_example/index.js", {
    config: "dist/ravendb_vite_cf_example/wrangler.json",
    experimental: { disableExperimentalWarning: true },
    logLevel: "warn"
});

try {
    const res = await worker.fetch("/");
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
