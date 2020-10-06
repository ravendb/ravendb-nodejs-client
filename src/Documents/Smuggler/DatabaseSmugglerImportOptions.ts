import { IDatabaseSmugglerImportOptions } from "./IDatabaseSmugglerImportOptions";
import { DatabaseSmugglerOptions } from "./DatabaseSmugglerOptions";

export class DatabaseSmugglerImportOptions extends DatabaseSmugglerOptions implements IDatabaseSmugglerImportOptions {

    public skipRevisionCreation: boolean;

    constructor()
    constructor(options: DatabaseSmugglerOptions)
    constructor(options?: DatabaseSmugglerOptions) {
        super();

        if (options) {
            this.includeExpired = options.includeExpired;
            this.includeArtificial = options.includeArtificial;
            this.maxStepsForTransformScript = options.maxStepsForTransformScript;
            this.operateOnTypes = [ ... options.operateOnTypes ];
            this.removeAnalyzers = options.removeAnalyzers;
            this.transformScript = options.transformScript;
        }
    }
}