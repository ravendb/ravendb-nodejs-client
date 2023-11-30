import { ServerNode } from "./ServerNode";
import { throwError } from "../Exceptions";

export class UpdateTopologyParameters {

    public readonly node: ServerNode;
    public timeoutInMs: number = 15_000;
    public forceUpdate: boolean;
    public debugTag: string;
    public applicationIdentifier: string;

    public constructor(node: ServerNode) {
        if (!node) {
            throwError("InvalidArgumentException", "Node cannot be null");
        }

        this.node = node;
    }
}
