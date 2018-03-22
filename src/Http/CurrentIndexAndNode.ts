import {ServerNode} from "./ServerNode";

export default class CurrentIndexAndNode {
    currentIndex: number;
    currentNode: ServerNode;

    constructor(currentIndex: number, currentNode: ServerNode) {
        this.currentIndex = currentIndex;
        this.currentNode = currentNode;
    }
}