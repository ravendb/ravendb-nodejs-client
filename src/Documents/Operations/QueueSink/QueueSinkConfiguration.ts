import { QueueBrokerType } from "../Etl/ConnectionString.js";
import { QueueSinkScript } from "./QueueSinkScript.js";

export interface QueueSinkConfiguration {
    brokerType: QueueBrokerType;
    taskId?: number;
    disabled?: boolean;
    name: string;
    /**
     * @deprecated This field never matched the server-side property and was ignored by the server.
     * Use mentorNode instead.
     */
    mentorName?: string;
    mentorNode?: string;
    pinToMentorNode?: boolean;
    connectionStringName: string;
    scripts: QueueSinkScript[];
}
