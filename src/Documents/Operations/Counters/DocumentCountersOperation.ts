import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { CounterOperation } from "./CounterOperation";

export class DocumentCountersOperation {
    public operations: CounterOperation[];

    public documentId: string;

    public serialize(conventions: DocumentConventions): object {
        const result = {
            DocumentId: this.documentId,
            Operations: this.operations.map(op => op.serialize(conventions))
        };

        return result;
    }
}
