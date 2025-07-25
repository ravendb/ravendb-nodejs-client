import { IRavenObject } from "../../../../Types/IRavenObject.js";
import { AiAgentToolQuery } from "./AiAgentToolQuery.js";
import { AiAgentToolAction } from "./AiAgentToolAction.js";
import { AiAgentPersistenceConfiguration } from "./AiAgentPersistenceConfiguration.js";
import { AiAgentChatTrimmingConfiguration } from "./AiAgentChatTrimmingConfiguration.js";

/**
 * Defines the configuration for an AI agent in RavenDB, including the system prompt,
 * tools (queries/actions), output schema, persistence settings, and connection string.
 */
export class AiAgentConfiguration implements IRavenObject {
    public constructor(name?: string, connectionStringName?: string, systemPrompt?: string) {
        if (name) this.name = name;
        if (connectionStringName) this.connectionStringName = connectionStringName;
        if (systemPrompt) this.systemPrompt = systemPrompt;
        
        this.queries = [];
        this.actions = [];
        this.parameters = new Set<string>();
    }

    /**
     * The identifier of the AI agent configuration.
     */
    public identifier: string;

    /**
     * The name of the AI agent configuration.
     */
    public name: string;

    /**
     * The name of the connection string used to connect to the AI provider.
     */
    public connectionStringName: string;

    /**
     * The prompt that guides the behavior and purpose of the AI agent.
     */
    public systemPrompt: string;

    /**
     * A sample object (as string) describing an example for an AI agent's output.
     * This allows validation and parsing of the AI-generated response according to a known format.
     */
    public sampleObject: string;

    /**
     * A JSON schema describing the expected structure of the AI agent's output.
     * This allows validation and parsing of the AI-generated response according to a known format.
     */
    public outputSchema: string;

    /**
     * Database-side tools: predefined queries that RavenDB executes to fetch data directly during chat.
     * The agent decides when to call them based on user input and context.
     * When the agent calls them, it gets an actual data from the database based on these queries.
     */
    public queries: AiAgentToolQuery[];

    /**
     * Model-side tools: callable actions where the AI agent fills parameters and invokes the tool as part of reasoning.
     * The agent decides when to call them based on user input and context.
     * When the agent calls them, it expects the user to provide "answers" for them.
     */
    public actions: AiAgentToolAction[];

    /**
     * Controls persistence behavior of chats - whether the chat history will be persistent or not
     */
    public persistence: AiAgentPersistenceConfiguration;

    /**
     * Names of the required parameters that are used in the agent's queries and actions.
     * Which has to be provided by the user each time we start a new chat.
     */
    public parameters: Set<string>;

    /**
     * Configuration for reducing the chat messages list of the AI agent.
     */
    public chatTrimming: AiAgentChatTrimmingConfiguration;

    public maxModelIterationsPerCall: number;
}
