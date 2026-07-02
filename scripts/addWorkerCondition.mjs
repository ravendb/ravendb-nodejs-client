// Post-build step for `prepare` (runs after tshy).
//
// tshy regenerates package.json "exports" on every build with only the
// "import" (ESM) and "require" (CommonJS) conditions. Cloudflare Workers and
// other edge bundlers (wrangler/esbuild, OpenNext, Vite) resolve the "workerd"
// and "worker" export conditions. Without them a bundler may fall back to the
// CommonJS `require()` chain, which is exactly the resolution path that breaks
// under an ESM bundler (RDBC-1083: "Class extends value [object Module]").
//
// We therefore inject "workerd" and "worker" conditions that always point at
// the ESM build, ordered BEFORE "import"/"require" so they win on Workers.
// The script is idempotent: it strips any conditions it previously added and
// re-inserts them, so repeated `prepare` runs converge to the same result.
import { readFileSync, writeFileSync } from "node:fs";

const PKG_PATH = new URL("../package.json", import.meta.url);
const WORKER_CONDITIONS = ["workerd", "worker"];

const pkg = JSON.parse(readFileSync(PKG_PATH, "utf8"));

if (!pkg.exports || typeof pkg.exports !== "object") {
    throw new Error("addWorkerCondition: package.json has no 'exports' map (did tshy run first?)");
}

let patched = 0;

for (const [subpath, entry] of Object.entries(pkg.exports)) {
    // Only conditional-object entries (e.g. "." -> { import, require }); skip
    // plain string entries like "./package.json".
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        continue;
    }

    // The ESM target is whatever the "import" condition resolves to.
    const esmTarget = entry.import;
    if (!esmTarget) {
        continue;
    }

    // Rebuild the entry so the worker conditions come first. Drop any previously
    // injected worker conditions to stay idempotent.
    const rest = {};
    for (const [condition, value] of Object.entries(entry)) {
        if (!WORKER_CONDITIONS.includes(condition)) {
            rest[condition] = value;
        }
    }

    const rebuilt = {};
    for (const condition of WORKER_CONDITIONS) {
        // Deep-clone the ESM target so each condition is an independent value.
        rebuilt[condition] = JSON.parse(JSON.stringify(esmTarget));
    }
    Object.assign(rebuilt, rest);

    pkg.exports[subpath] = rebuilt;
    patched++;
}

writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
// Log to stderr so it never pollutes stdout of `npm pack --silent` (which is
// parsed to obtain the tarball filename in CI).
console.error(`addWorkerCondition: injected ${WORKER_CONDITIONS.join("/")} into ${patched} export(s).`);
