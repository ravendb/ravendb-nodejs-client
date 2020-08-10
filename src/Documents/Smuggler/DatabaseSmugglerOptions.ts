import { IDatabaseSmugglerOptions } from "./IDatabaseSmugglerOptions";
import { DatabaseItemType } from "./DatabaseItemType";
import { DatabaseRecordItemType } from "./DatabaseRecordItemType";

export class DatabaseSmugglerOptions implements IDatabaseSmugglerOptions {
    public static readonly DEFAULT_OPERATE_ON_TYPES: DatabaseItemType[] = [
        "Indexes", "Documents", "RevisionDocuments", "Conflicts", "DatabaseRecord", "Identities",
        "CompareExchange", "Attachments", "CounterGroups", "Subscriptions"
    ];

    public static readonly DEFAULT_OPERATE_ON_DATABASE_RECORD_TYPES: DatabaseRecordItemType[] = [
        "Client", "Expiration", "ExternalReplications", "PeriodicBackups", "RavenConnectionStrings",
        "RavenEtls", "Revisions", "Settings", "SqlConnectionStrings", "Sorters", "SqlEtls",
        "HubPullReplications", "SinkPullReplications"
    ];

    private static readonly DEFAULT_MAX_STEPS_FOR_TRANSFORM_SCRIPT: number = 10 * 1_000;

    public operateOnTypes: DatabaseItemType[];
    public operateOnDatabaseRecordType: DatabaseRecordItemType[];
    public includeExpired: boolean;
    public includeArtificial: boolean;
    public removeAnalyzers: boolean;
    public transformScript: string;
    public maxStepsForTransformScript: number;

    /**
     * @deprecated
     */
    public skipRevisionCreation: boolean;

    public encryptionKey: string;

    constructor() {
        this.operateOnTypes = [...DatabaseSmugglerOptions.DEFAULT_OPERATE_ON_TYPES];
        this.operateOnDatabaseRecordType = [...DatabaseSmugglerOptions.DEFAULT_OPERATE_ON_DATABASE_RECORD_TYPES];
        this.maxStepsForTransformScript = DatabaseSmugglerOptions.DEFAULT_MAX_STEPS_FOR_TRANSFORM_SCRIPT;
        this.includeExpired = true;
    }
}