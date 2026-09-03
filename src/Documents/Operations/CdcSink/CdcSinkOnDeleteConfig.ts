/**
 * Controls how DELETE events are handled for a CDC Sink table.
 */
export class CdcSinkOnDeleteConfig {
    public patch: string = null;
    public ignoreDeletes: boolean = false;
}
