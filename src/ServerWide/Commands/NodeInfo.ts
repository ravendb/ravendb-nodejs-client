import { BuildNumber } from "../Operations/BuildNumber.js";
import { ServerNodeRole } from "../../Http/ServerNode.js";
import { OsInfo } from "../Operations/OsInfo.js";
import { RachisState } from "../RachisState.js";

export interface NodeInfo {
    nodeTag: string;
    topologyId: string;
    certificate: string;
    clusterStatus: string;
    numberOfCores: number;
    installedMemoryInGb: number;
    usableMemoryInGb: number;
    buildInfo: BuildNumber;
    osInfo: OsInfo;
    serverId: string;
    currentState: RachisState;
    serverRole: ServerNodeRole;
    hasFixedPort: boolean;
    serverSchemaVersion: number;
}
