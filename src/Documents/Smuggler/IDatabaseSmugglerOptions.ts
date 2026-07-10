import { DatabaseItemType } from "./DatabaseItemType.js";
import { DatabaseRecordItemType } from "./DatabaseRecordItemType.js";

export interface IDatabaseSmugglerOptions {
    operateOnTypes: DatabaseItemType[];
    includeExpired: boolean;
    includeArtificial: boolean;
    includeArchived: boolean;
    removeAnalyzers: boolean;
    transformScript: string;
    maxStepsForTransformScript: number;
    skipRevisionCreation: boolean;
    collections: string[];
    operateOnDatabaseRecordType: DatabaseRecordItemType[];
    maxReadOpsPerSecond?: number;
    skipCorruptedData?: boolean;
}
