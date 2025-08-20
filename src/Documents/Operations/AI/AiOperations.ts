import type { IDocumentStore } from "../../IDocumentStore.js";
import type { AiAgentConfiguration } from "./Agents/config/AiAgentConfiguration.js";
import type { AiAgentConfigurationResult } from "./Agents/AiAgentConfigurationResult.js";
import type { GetAiAgentsResponse } from "./Agents/GetAiAgentsResponse.js";
import type { AiConversationCreationOptions } from "./Agents/AiConversationCreationOptions.js";
import { AddOrUpdateAiAgentOperation, DeleteAiAgentOperation, GetAiAgentsOperation } from "./Agents/index.js";
import { MaintenanceOperationExecutor } from "../MaintenanceOperationExecutor.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { AiConversation } from "./AiConversation.js";

export class AiOperations {
    private readonly _store: IDocumentStore;
    private readonly _databaseName: string;
    private readonly _executor: MaintenanceOperationExecutor;

    /**
     * Initializes a new instance of AiOperations for a given document store and optional database name.
     */
    public constructor(store: IDocumentStore, databaseName?: string) {
        this._store = store;
        this._databaseName = databaseName || store.database;
        this._executor = this._store.maintenance.forDatabase(this._databaseName);
    }

    /**
     * Returns an AiOperations instance for a different database.
     */
    public forDatabase(databaseName: string): AiOperations {
        if (StringUtil.equalsIgnoreCase(this._databaseName, databaseName)) {
            return this;
        }
        return new AiOperations(this._store, databaseName);
    }

    /**
     * Creates or updates an AI agent configuration (with the given schema) on the database.
     */
    public async createAgent<TSchema>(
        configuration: AiAgentConfiguration,
        schemaType?: TSchema
    ): Promise<AiAgentConfigurationResult> {
        const operation = new AddOrUpdateAiAgentOperation(configuration, schemaType);
        return await this._executor.send(operation);
    }

    /**
     * Retrieves the AI agent configuration for a specific agent.
     */
    public async getAgent(agentId: string): Promise<AiAgentConfiguration | null> {
        const operation = new GetAiAgentsOperation(agentId);
        const response = await this._executor.send(operation);
        return response.aiAgents && response.aiAgents.length > 0 ? response.aiAgents[0] : null;
    }

    /**
     * Retrieves all AI agents and their configurations.
     */
    public async getAgents(): Promise<GetAiAgentsResponse> {
        const operation = new GetAiAgentsOperation();
        return await this._executor.send(operation);
    }

    /**
     * Deletes an AI agent configuration.
     */
    public async deleteAgent(identifier: string): Promise<AiAgentConfigurationResult> {
        const operation = new DeleteAiAgentOperation(identifier);
        return await this._executor.send(operation);
    }

    /**
     * Opens an AI conversation for an agent.
     */
    public conversation(agentId: string, conversationId: string, creationOptions?: AiConversationCreationOptions, changeVector?: string): AiConversation {
        return new AiConversation(this._store, this._databaseName, agentId, conversationId, creationOptions, changeVector);
    }
}