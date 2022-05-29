import { IDatabaseSmugglerOptions } from "./IDatabaseSmugglerOptions";

export interface IDatabaseSmugglerImportOptions extends IDatabaseSmugglerOptions {
    skipRevisionCreation: boolean;
}
