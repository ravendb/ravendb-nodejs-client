/**
 * Utility class for detecting runtime environment
 */
export class RuntimeUtil {
    private static _isBun: boolean = null;

    /**
     * Detects if the code is running in Bun runtime
     */
    public static isBun(): boolean {
        if (this._isBun === null) {
            this._isBun = !!process.versions.bun;
        }
        return this._isBun;
    }
}
