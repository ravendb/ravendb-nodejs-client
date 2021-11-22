import { RollingIndexState } from "./RollingIndexState";

export interface RollingIndexDeployment {
    state: RollingIndexState;
    createdAt: Date;
    startedAt: Date;
    finishedAt: Date;
}