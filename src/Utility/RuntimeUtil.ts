/**
 * Utility class for detecting runtime environment
 */
export class RuntimeUtil {
    private static _isBun: boolean = null;
    private static _isWorkerd: boolean = null;

    /**
     * Detects if the code is running in Bun runtime
     */
    public static isBun(): boolean {
        if (this._isBun === null) {
            this._isBun = typeof process !== "undefined" && !!process.versions?.bun;
        }
        return this._isBun;
    }

    /**
     * Detects if the code is running in the Cloudflare Workers (workerd) runtime.
     *
     * workerd exposes the Web `navigator.userAgent` as the string
     * "Cloudflare-Workers", which is the officially documented way to detect it.
     * We match by prefix so a future version suffix (e.g. "Cloudflare-Workers/1")
     * still resolves to workerd instead of failing closed into the Node path
     * (which would then crash trying to build an undici agent that workerd lacks).
     */
    public static isWorkerd(): boolean {
        if (this._isWorkerd === null) {
            const nav = (globalThis as unknown as { navigator?: { userAgent?: string } }).navigator;
            this._isWorkerd = !!nav && typeof nav.userAgent === "string"
                && nav.userAgent.startsWith("Cloudflare-Workers");
        }
        return this._isWorkerd;
    }
}
