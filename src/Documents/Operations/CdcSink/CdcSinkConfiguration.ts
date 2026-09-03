import { CdcSinkPostgresSettings } from "./CdcSinkPostgresSettings.js";
import { CdcSinkTableConfig } from "./CdcSinkTableConfig.js";

/**
 * Configuration of a CDC Sink task: maps source SQL tables to RavenDB collections.
 * `postgres` is omitted from the wire when unset; the server auto-fills it for Npgsql connections.
 */
export class CdcSinkConfiguration {
    public name: string = null;
    public taskId: number = 0;
    public disabled: boolean = false;
    public connectionStringName: string = null;
    public mentorNode: string = null;
    public pinToMentorNode: boolean = false;
    public tables: CdcSinkTableConfig[] = [];
    public postgres?: CdcSinkPostgresSettings;
    public skipInitialLoad: boolean = false;

    public toJSON() {
        return {
            name: this.name ?? null,
            taskId: this.taskId,
            disabled: this.disabled,
            connectionStringName: this.connectionStringName ?? null,
            mentorNode: this.mentorNode ?? null,
            pinToMentorNode: this.pinToMentorNode,
            tables: this.tables ?? [],
            ...(this.postgres ? { postgres: this.postgres } : {}),
            skipInitialLoad: this.skipInitialLoad
        };
    }
}
