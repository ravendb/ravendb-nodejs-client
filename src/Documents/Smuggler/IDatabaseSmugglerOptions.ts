import { DatabaseItemType } from "./DatabaseItemType";
import { DatabaseRecordItemType } from "./DatabaseRecordItemType";

export interface IDatabaseSmugglerOptions {
    operateOnTypes: DatabaseItemType[];
    includeExpired: boolean;
    removeAnalyzers: boolean;
    transformScript: string;
    maxStepsForTransformScript: number;
    skipRevisionCreation: boolean;
    collections: string[];
    operateOnDatabaseRecordType: DatabaseRecordItemType[];
}
