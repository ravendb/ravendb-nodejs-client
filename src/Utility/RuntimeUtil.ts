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
     * workerd exposes the Web `navigator.userAgent` as the fixed string
     * "Cloudflare-Workers", which is the officially documented way to detect it.
     */
    public static isWorkerd(): boolean {
        if (this._isWorkerd === null) {
            const nav = (globalThis as unknown as { navigator?: { userAgent?: string } }).navigator;
            this._isWorkerd = !!nav && nav.userAgent === "Cloudflare-Workers";
        }
        return this._isWorkerd;
    }
}
