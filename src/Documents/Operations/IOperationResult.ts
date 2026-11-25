export interface IOperationResult {
    message: string;
}

export interface IShardedOperationResult<TResult extends IOperationResult = IOperationResult> extends IOperationResult {
    results: TResult[];
}

export interface IShardNodeOperationResult<TResult extends IOperationResult = IOperationResult> extends IOperationResult {
    shardNumber: number;
    nodeTag: string;
    result: TResult;
}
