import { IDocumentStore } from "../IDocumentStore.js";
import { MaintenanceOperationExecutor } from "../Operations/MaintenanceOperationExecutor.js";
import { StringUtil } from "../../Utility/StringUtil.js";
import { AiAgentConfiguration } from "../Operations/AI/Agents/AiAgentConfiguration.js";
import { AiAgentConfigurationResult } from "../Operations/AI/Agents/AiAgentConfigurationResult.js";
import { AddOrUpdateAiAgentOperation } from "../Operations/AI/Agents/AddOrUpdateAiAgentOperation.js";
import { GetAiAgentOperation, GetAiAgentsResponse } from "../Operations/AI/Agents/GetAiAgentOperation.js";
import { DeleteAiAgentOperation } from "../Operations/AI/Agents/DeleteAiAgentOperation.js";
import { AiConversation } from "./AiConversation.js";
import { IAiConversationOperations } from "./IAiConversationOperations.js";
import { AiAgentParametersBuilder, IAiAgentParametersBuilder } from "./AiAgentParametersBuilder.js";

/**
 * Manages AI agents and conversation interactions in a specific RavenDB database.
 */
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
     * Gets the underlying maintenance operation executor
     */
    public get maintenance(): MaintenanceOperationExecutor {
        return this._executor;
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
        schemaType?: { new(): TSchema }
    ): Promise<AiAgentConfigurationResult> {
        const operation = new AddOrUpdateAiAgentOperation(configuration, schemaType);
        return await this._executor.send(operation);
    }

    /**
     * Retrieves the AI agent configuration for a specific agent.
     */
    public async getAgent(agentId: string): Promise<AiAgentConfiguration | null> {
        const operation = new GetAiAgentOperation(agentId);
        const response = await this._executor.send(operation);
        return response.aiAgents && response.aiAgents.length > 0 ? response.aiAgents[0] : null;
    }

    /**
     * Retrieves all AI agents and their configurations.
     */
    public async getAgents(): Promise<GetAiAgentsResponse> {
        const operation = new GetAiAgentOperation();
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
     * Starts a new conversation with an AI agent.
     */
    public startConversation<TSchema>(agentId: string): IAiConversationOperations<TSchema>;
    public startConversation<TSchema>(agentId: string, parameters: Record<string, any>): IAiConversationOperations<TSchema>;
    public startConversation<TSchema>(agentId: string, parametersBuilder: (builder: IAiAgentParametersBuilder) => void): IAiConversationOperations<TSchema>;
    public startConversation<TSchema>(
        agentId: string,
        parametersOrBuilder?: Record<string, any> | ((builder: IAiAgentParametersBuilder) => void)
    ): IAiConversationOperations<TSchema> {
        let parameters: Record<string, any> | undefined;

        if (typeof parametersOrBuilder === "function") {
            const builder = new AiAgentParametersBuilder();
            parametersOrBuilder(builder);
            parameters = builder.getParameters() ?? undefined;
        } else {
            parameters = parametersOrBuilder;
        }

        return AiConversation.start<TSchema>(this._executor, agentId, parameters);
    }

    /**
     * Resumes an existing conversation with an AI agent.
     */
    public resumeConversation<TSchema>(conversationId: string, changeVector: string | null = null): IAiConversationOperations<TSchema> {
        return AiConversation.resume<TSchema>(this._executor, conversationId, changeVector);
    }
}
