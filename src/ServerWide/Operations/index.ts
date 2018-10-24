export interface DatabasePutResult {
    raftCommandIndex: number;
    name: string;
    topology: DatabaseTopology;
    nodesAddedTo: string[];
}

export type DatabasePromotionStatus =
    | "WaitingForFirstPromotion"
    | "NotResponding"
    | "IndexNotUpToDate"
    | "ChangeVectorNotMerged"
    | "WaitingForResponse"
    | "Ok";

export interface DatabaseTopology {
    members: string[];
    promotables: string[];
    rehabs: string[];
    predefinedMentors: { [key: string]: string };
    demotionReasons: { [key: string]: string };
    promotablesStatus: { [key: string]: DatabasePromotionStatus };
    replicationFactor: number;
    dynamicNodesDistribution: boolean;
    stamp: LeaderStamp;
    databaseTopologyIdBase64: string;
}

export interface LeaderStamp {
    index: number;
    term: number;
    leadersTicks: number;
}
