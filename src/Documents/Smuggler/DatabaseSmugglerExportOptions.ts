import { DatabaseSmugglerOptions } from "./DatabaseSmugglerOptions";
import { IDatabaseSmugglerExportOptions } from "./IDatabaseSmugglerExportOptions";

export class DatabaseSmugglerExportOptions extends DatabaseSmugglerOptions implements IDatabaseSmugglerExportOptions {

    public collections: string[];

    constructor() {
        super();

        this.collections = [];
    }
}
