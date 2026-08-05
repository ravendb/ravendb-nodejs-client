import { throwError } from "../../../Exceptions/index.js";

/**
 * Helpers for encoding Azure Service Bus sources as strings stored in QueueSinkScript.queues.
 *
 * Encoding convention:
 * - "queueName" - a Service Bus queue.
 * - "topicName;subscriptionName" - a topic subscription.
 *
 * The semicolon is used as the separator because Service Bus naming rules forbid
 * ";" in queue, topic, and subscription names, so the delimiter is collision-safe.
 */
export class AzureServiceBusSinkSource {
    public static readonly SEPARATOR = ";";

    /**
     * Returns the encoded entry for a queue. Currently a pass-through; provided for symmetry and future-proofing.
     */
    public static queue(queueName: string): string {
        if (!queueName || !queueName.trim()) {
            throwError("InvalidArgumentException", "Queue name must be non-empty.");
        }

        if (queueName.includes(AzureServiceBusSinkSource.SEPARATOR)) {
            throwError("InvalidArgumentException", `Queue name must not contain the '${AzureServiceBusSinkSource.SEPARATOR}' character.`);
        }

        return queueName;
    }

    /**
     * Returns the encoded entry for a topic subscription, in the form "topic;subscription".
     */
    public static subscription(topicName: string, subscriptionName: string): string {
        if (!topicName || !topicName.trim()) {
            throwError("InvalidArgumentException", "Topic name must be non-empty.");
        }

        if (!subscriptionName || !subscriptionName.trim()) {
            throwError("InvalidArgumentException", "Subscription name must be non-empty.");
        }

        if (topicName.includes(AzureServiceBusSinkSource.SEPARATOR)) {
            throwError("InvalidArgumentException", `Topic name must not contain the '${AzureServiceBusSinkSource.SEPARATOR}' character.`);
        }

        if (subscriptionName.includes(AzureServiceBusSinkSource.SEPARATOR)) {
            throwError("InvalidArgumentException", `Subscription name must not contain the '${AzureServiceBusSinkSource.SEPARATOR}' character.`);
        }

        return `${topicName}${AzureServiceBusSinkSource.SEPARATOR}${subscriptionName}`;
    }
}
