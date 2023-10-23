import { EtlConfiguration } from "../EtlConfiguration";
import { EtlType, QueueBrokerType, QueueConnectionString } from "../ConnectionString";
import { EtlQueue } from "./EtlQueue";
import { DocumentConventions } from "../../../Conventions/DocumentConventions";

export class QueueEtlConfiguration extends EtlConfiguration<QueueConnectionString> {
    public queues: EtlQueue[];
    public brokerType: QueueBrokerType;
    public skipAutomaticQueueDeclaration: boolean;

    public etlType: EtlType = "Queue";

    public serialize(conventions: DocumentConventions): object {
        const result = super.serialize(conventions) as any;
        result.EtlType = this.etlType;
        result.Queues = this.queues ? this.queues.map(this.serializeQueue) : null;
        result.BrokerType = this.brokerType;
        result.SkipAutomaticQueueDeclaration = this.skipAutomaticQueueDeclaration;
        return result;
    }

    private serializeQueue(queue: EtlQueue) {
        return {
            Name: queue.name,
            DeleteProcessedDocuments: queue.deleteProcessedDocuments
        }
    }
}
