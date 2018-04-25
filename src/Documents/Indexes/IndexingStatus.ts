
export type IndexRunningStatus = "Running" | "Paused" | "Disabled";

export interface IndexingStatus {
    status: IndexRunningStatus;
    indexes: IndexStatus[];
}

export interface IndexStatus {
    name: string;
    status: IndexRunningStatus;
}
