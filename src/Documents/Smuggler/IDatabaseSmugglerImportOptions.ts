import { IDatabaseSmugglerOptions } from "./IDatabaseSmugglerOptions";

// tslint:disable-next-line:no-empty-interface
export interface IDatabaseSmugglerImportOptions extends IDatabaseSmugglerOptions {
    skipRevisionCreation: boolean;
}