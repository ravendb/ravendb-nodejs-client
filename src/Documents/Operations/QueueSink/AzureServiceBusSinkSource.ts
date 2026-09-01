import { StringUtil } from "../../../Utility/StringUtil.js";
import { throwError } from "../../../Exceptions/index.js";

// Service Bus naming rules forbid ';' in queue/topic/subscription names, so it is a collision-safe separator
const separator = ";";

export class AzureServiceBusSinkSource {
    public static queue(queueName: string): string {
        if (StringUtil.isNullOrWhitespace(queueName)) {
            throwError("InvalidArgumentException", "Queue name must be non-empty.");
        }

        if (queueName.includes(separator)) {
            throwError("InvalidArgumentException", `Queue name must not contain the '${separator}' character.`);
        }

        return queueName;
    }

    public static subscription(topicName: string, subscriptionName: string): string {
        if (StringUtil.isNullOrWhitespace(topicName)) {
            throwError("InvalidArgumentException", "Topic name must be non-empty.");
        }

        if (StringUtil.isNullOrWhitespace(subscriptionName)) {
            throwError("InvalidArgumentException", "Subscription name must be non-empty.");
        }

        if (topicName.includes(separator)) {
            throwError("InvalidArgumentException", `Topic name must not contain the '${separator}' character.`);
        }

        if (subscriptionName.includes(separator)) {
            throwError("InvalidArgumentException", `Subscription name must not contain the '${separator}' character.`);
        }

        return `${topicName}${separator}${subscriptionName}`;
    }
}
