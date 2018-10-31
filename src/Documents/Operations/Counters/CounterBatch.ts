import { DocumentCountersOperation } from "./DocumentCountersOperation";
import { DocumentConventions } from "../../Conventions/DocumentConventions";

export class CounterBatch {
    public replyWithAllNodesValues: boolean;
    public documents: DocumentCountersOperation[] = [];
    public fromEtl: boolean;

    public serialize(conventions: DocumentConventions): object {
        return {
            ReplyWithAllNodesValues: this.replyWithAllNodesValues,
            Documents: this.documents.map(x => x.serialize(conventions)),
            FromEtl: this.fromEtl
        };
    }
}
