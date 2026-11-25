import { IShardedOperationResult, IShardNodeOperationResult } from "../Operations/IOperationResult.js";
import { IShardedOperationProgress } from "../Operations/IOperationProgress.js";
import { SmugglerProgress, SmugglerResult } from "./SmugglerResult.js";

export type ShardedSmugglerResult = IShardedOperationResult<ShardNodeSmugglerResult>;

export type ShardNodeSmugglerResult = IShardNodeOperationResult<SmugglerResult>;

export type ShardedSmugglerProgress = SmugglerProgress & IShardedOperationProgress;
