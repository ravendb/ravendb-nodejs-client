import { IRavenObject } from "../../../../Types/IRavenObject.js";

/**
 * Represents a query tool that can be invoked by an AI agent.
 * The tool includes a name, description, query string, and parameter schema or sample object.
 * When invoked by the AI model, the query is expected to be executed by the server (database),
 * and its results provided back to the model.
 */
export class AiAgentToolQuery implements IRavenObject {
    public constructor(name?: string, description?: string, query?: string) {
        if (name) this.name = name;
        if (description) this.description = description;
        if (query) this.query = query;
    }

    /**
     * The name of the tool query.
     * This is the identifier used by the AI to reference this specific query.
     */
    public name: string;

    /**
     * The description of the tool query.
     * Used by the AI to understand when to invoke this query.
     */
    public description: string;

    /**
     * The actual query string (RQL) that represents this tool.
     * This query will not be executed by the database when the model requests for this tool.
     */
    public query: string;

    /**
     * A sample object representing the parameters for this tool.
     * This should be a JSON-formatted string, showing an example of valid parameters.
     */
    public parametersSampleObject?: string;

    /**
     * The JSON schema for the parameters expected by this tool.
     * This schema is used to validate and assist the AI in forming correct tool calls.
     */
    public parametersSchema?: string;
}
