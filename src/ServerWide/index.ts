
export class ScriptResolver {
    public script: string;
    public lastModifiedTime: Date;
}

export class ConflictSolver {
    public resolveByCollection: { [key: string]: ScriptResolver };
    public resolveToLatest: boolean;
}

export class DatabaseRecord {
    public databaseName: string;
    public disabled: boolean;
    public dataDirectory: string;
    public settings: { [key: string]: string } = {};
    public conflictSolverConfig: ConflictSolver;
}
