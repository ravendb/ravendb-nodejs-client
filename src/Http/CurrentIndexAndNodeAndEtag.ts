import { ServerNode } from "./ServerNode";

export interface CurrentIndexAndNodeAndEtag {
    currentIndex: number;
    currentNode: ServerNode;
    topologyEtag: number;
}