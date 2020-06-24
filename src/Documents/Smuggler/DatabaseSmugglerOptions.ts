import { IDatabaseSmugglerOptions } from "./IDatabaseSmugglerOptions";
import { DatabaseItemType } from "./DatabaseItemType";

export class DatabaseSmugglerOptions implements IDatabaseSmugglerOptions {
    public static readonly DEFAULT_OPERATE_ON_TYPES: DatabaseItemType[] = [
        "Indexes", "Documents", "RevisionDocuments", "Conflicts", "DatabaseRecord", "Identities",
        "CompareExchange", "Counters"
    ];

    private static readonly DEFAULT_MAX_STEPS_FOR_TRANSFORM_SCRIPT: number = 10 * 1_000;

    public operateOnTypes: DatabaseItemType[];
    public includeExpired: boolean;
    public removeAnalyzers: boolean;
    public transformScript: string;
    public maxStepsForTransformScript: number;
    public skipRevisionCreation: boolean;

    constructor() {
        this.operateOnTypes = [...DatabaseSmugglerOptions.DEFAULT_OPERATE_ON_TYPES];
        this.maxStepsForTransformScript = DatabaseSmugglerOptions.DEFAULT_MAX_STEPS_FOR_TRANSFORM_SCRIPT;
        this.includeExpired = true;
    }
}