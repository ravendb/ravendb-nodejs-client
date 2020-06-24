import { IDatabaseSmugglerOptions } from "./IDatabaseSmugglerOptions";

export interface IDatabaseSmugglerExportOptions extends IDatabaseSmugglerOptions {
    collections: string[];
}