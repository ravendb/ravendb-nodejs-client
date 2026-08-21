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
            // `process` is absent on some edge runtimes (e.g. Cloudflare Workers/workerd),
            // where a bare reference would throw a ReferenceError at module-load time and
            // crash the very load path this detection protects. Keep the `typeof` guard --
            // do not "simplify" it away. See isWorkerd().
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

    /**
     * Detects if the code is running in the Deno runtime.
     *
     * Not cached: unlike `process`/`navigator` sniffing this is a cheap property
     * probe, and tests fake `globalThis.Deno` around single calls.
     */
    public static isDeno(): boolean {
        const deno = (globalThis as { Deno?: { version?: { deno?: unknown } } }).Deno;
        return !!deno && typeof deno.version?.deno === "string";
    }

    /**
     * Whether the current runtime can accept an undici `Dispatcher` (Node's undici
     * Agent) in a `fetch` init. Node can; Bun, Cloudflare Workers (workerd) and Deno
     * cannot -- their `fetch` has no dispatcher concept, so building or passing one is
     * meaningless (Deno's fetch silently ignores it, which used to drop a configured
     * client certificate on the floor).
     *
     * Centralized here so the two consumers -- request send (RavenCommand.send) and http
     * agent creation (RequestExecutor.getHttpAgent) -- stay in lockstep: if they drift
     * (an agent is built but the dispatcher is dropped on send, or vice versa) the
     * original workerd failure returns. A future dispatcher-less runtime is added once.
     */
    public static supportsUndiciDispatcher(): boolean {
        return !this.isBun() && !this.isWorkerd() && !this.isDeno();
    }
}
