import { IExternalReplication } from "../../../Documents/Operations/Replication/IExternalReplication";
import { IServerWideTask } from "./IServerWideTask";

export interface ServerWideExternalReplication extends IExternalReplication, IServerWideTask {
    topologyDiscoveryUrls: string[];
}
