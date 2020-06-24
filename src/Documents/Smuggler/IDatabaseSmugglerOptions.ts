import { DatabaseItemType } from "./DatabaseItemType";

export interface IDatabaseSmugglerOptions {
    operateOnTypes: DatabaseItemType[];
    includeExpired: boolean;
    removeAnalyzers: boolean;
    transformScript: string;
    maxStepsForTransformScript: number;
    skipRevisionCreation: boolean;
}