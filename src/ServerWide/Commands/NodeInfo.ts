import { BuildNumber } from "../Operations/BuildNumber";
import { ServerNodeRole } from "../../Http/ServerNode";

export interface NodeInfo {
    nodeTag: string;
    topologyId: string;
    certificate: string;
    clusterStatus: string;
    numberOfCores: number;
    installedMemoryInGb: number;
    usableMemoryInGb: number;
    buildInfo: BuildNumber;
    serverRole: ServerNodeRole;
    hasFixedPort: boolean;
    serverSchemaVersion: number;
}
