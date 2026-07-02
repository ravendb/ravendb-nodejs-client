import { defineNitroConfig } from "nitropack/config";

// TanStack Start deploys to Cloudflare through Nitro; this mirrors that toolchain.
export default defineNitroConfig({
    compatibilityDate: "2024-12-30",
    preset: "cloudflare-module"
});
