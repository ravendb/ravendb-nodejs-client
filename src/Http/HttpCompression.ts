import type { Transform } from "node:stream";
import { HttpCompressionAlgorithm } from "./HttpCompressionAlgorithm.js";

let zlibModule: Promise<typeof import("node:zlib") | null>;

export function loadZlib() {
    return zlibModule ??= import("node:zlib").catch(() => null);
}

export function createDecompressor(zlib: typeof import("node:zlib"), encoding: string | string[]): Transform {
    const name = (Array.isArray(encoding) ? encoding[0] : encoding ?? "").trim().toLowerCase();

    switch (name) {
        case "gzip":
        case "x-gzip":
            return zlib.createGunzip();
        case "deflate":
            return zlib.createInflate();
        case "br":
            return zlib.createBrotliDecompress();
        case "zstd":
            return typeof zlib.createZstdDecompress === "function" ? zlib.createZstdDecompress() : null;
        default:
            return null;
    }
}

export function decompressSync(zlib: typeof import("node:zlib"), encoding: string, data: Buffer): Buffer | null {
    switch (encoding.trim().toLowerCase()) {
        case "gzip":
        case "x-gzip":
            return zlib.gunzipSync(data);
        case "deflate":
            return zlib.inflateSync(data);
        case "br":
            return zlib.brotliDecompressSync(data);
        case "zstd":
            return typeof zlib.zstdDecompressSync === "function" ? zlib.zstdDecompressSync(data) : null;
        default:
            return null;
    }
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
