
export interface ScriptResolver {
    script: string;
    lastModifiedTime: Date;
}

export interface ConflictSolver {
    resolveByCollection: { [key: string]: ScriptResolver };
    resolveToLatest: boolean;
}

export interface DatabaseRecord {
    databaseName: string;
    disabled?: boolean;
    dataDirectory?: string;
    settings?: { [key: string]: string };
    conflictSolverConfig?: ConflictSolver;
}

export interface DatabaseRecordWithEtag extends DatabaseRecord {
    etag: number;
}
