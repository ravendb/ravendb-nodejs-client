// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IOperationProgress {
}

export interface IShardedOperationProgress extends IOperationProgress {
    shardNumber: number;
    nodeTag: string;
}
