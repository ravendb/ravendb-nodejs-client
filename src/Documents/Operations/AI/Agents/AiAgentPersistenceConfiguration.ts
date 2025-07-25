import { IRavenObject } from "../../../../Types/IRavenObject.js";

/**
 * Configuration for persisting chat history in RavenDB.
 * Defines where chat sessions should be stored and optionally how long they should be retained (expiration).
 */
export class AiAgentPersistenceConfiguration implements IRavenObject {
    public constructor(conversationIdPrefix?: string, expires?: number) {
        if (conversationIdPrefix) {
            this.conversationIdPrefix = conversationIdPrefix;
        }
        if (expires !== undefined) {
            this.conversationExpirationInSec = expires;
        }
    }

    /**
     * The prefix of the conversation ID.
     * This is typically like "chats/" or "conversations/".
     * This allows separation between different types of persisted AI conversations.
     */
    public conversationIdPrefix: string;

    /**
     * Optional expiration duration. If provided, chat documents will expire (and be deleted)
     * automatically after this time has passed since creation.
     */
    public conversationExpirationInSec: number;
}
