// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IOperationProgress {
}

export interface DeterminateProgress extends IOperationProgress {
    processed: number;
    total: number;
}

export interface IndeterminateProgressCount extends IOperationProgress {
    processed: number;
}

export interface IndeterminateProgress extends IOperationProgress {
    progress: string;
}
