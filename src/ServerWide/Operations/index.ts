export interface DatabasePutResult {
    raftCommandIndex: number;
    name: string;
    topology: DatabaseTopology;
    nodesAddedTo: string[];
}

export type DatabasePromotionStatus = "WAITING_FOR_FIRST_PROMOTION"
    | "NOT_RESPONDING"
    | "INDEX_NOT_UP_TO_DATE"
    | "CHANGE_VECTOR_NOT_MERGED"
    | "WAITING_FOR_RESPONSE"
    | "OK";

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
}

export interface LeaderStamp {
    index: number;
    term: number;
    leadersTicks: number;
}
