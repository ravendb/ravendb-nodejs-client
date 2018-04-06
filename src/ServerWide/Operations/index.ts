export class DatabasePutResult {

    public raftCommandIndex: number;
    public name: string;
    public topology: DatabaseTopology;
    public nodesAddedTo: string[];
}

export type DatabasePromotionStatus = "WAITING_FOR_FIRST_PROMOTION"
    | "NOT_RESPONDING"
    | "INDEX_NOT_UP_TO_DATE"
    | "CHANGE_VECTOR_NOT_MERGED"
    | "WAITING_FOR_RESPONSE"
    | "OK";

export class DatabaseTopology {
    public members: string[];
    public promotables: string[];
    public rehabs: string[];
    public predefinedMentors: { [key: string]: string };
    public demotionReasons: { [key: string]: string };
    public promotablesStatus: { [key: string]: DatabasePromotionStatus };
    public replicationFactor: number;
    public dynamicNodesDistribution: boolean;
    public stamp: LeaderStamp;
}

export class LeaderStamp {
    public index: number;
    public term: number;
    public leadersTicks: number;
}
