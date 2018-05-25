export interface GetConflictsResult {
    id: string;
    results: Conflict[];
    largestEtag: number;
}

export interface Conflict {
    lastModified: Date;
    changeVector: string;
    doc: object;
}
