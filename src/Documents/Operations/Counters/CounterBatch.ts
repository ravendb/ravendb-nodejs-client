import { DocumentCountersOperation } from "./DocumentCountersOperation";

export class CounterBatch {
    public replyWithAllNodesValues: boolean;
    public documents: DocumentCountersOperation[] = [];
    public fromEtl: boolean;

    public serialize(): object {
        return {
            ReplyWithAllNodesValues: this.replyWithAllNodesValues,
            Documents: this.documents.map(x => x.serialize()),
            FromEtl: this.fromEtl
        };
    }
}
