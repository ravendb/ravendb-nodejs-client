import { HttpCompressionAlgorithm } from "./HttpCompressionAlgorithm.js";

let zlibModule: Promise<typeof import("node:zlib") | null>;

function loadZlib() {
    return zlibModule ??= import("node:zlib").catch(() => null);
}

export function contentEncodingOf(algorithm: HttpCompressionAlgorithm): string {
    return algorithm === "Zstd" ? "zstd" : "gzip";
}

/**
 * Returns null when the runtime's zlib cannot produce the requested encoding;
 * the body is then sent uncompressed.
 */
export async function compressRequestBody(body: string, algorithm: HttpCompressionAlgorithm): Promise<Uint8Array | null> {
    const zlib = await loadZlib();
    if (!zlib) {
        return null;
    }

    try {
        // fastest levels, like the C# client; sync because async zlib costs ~10x more CPU on typical request bodies
        return algorithm === "Zstd"
            ? zlib.zstdCompressSync(body, { params: { [zlib.constants.ZSTD_c_compressionLevel]: 1 } })
            : zlib.gzipSync(body, { level: zlib.constants.Z_BEST_SPEED });
    } catch {
        // partial node:zlib polyfills (e.g. unenv on edge runtimes) stub or omit zstd
        return null;
    }
}
