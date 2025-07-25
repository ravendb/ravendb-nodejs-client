import { IRavenObject } from "../../../../Types/IRavenObject.js";

/**
 * Represents a tool action that can be invoked by an AI agent.
 * Includes metadata such as name, description, and optional parameters schema or sample.
 * Tool actions represent external functions whose results are provided by the user
 */
export class AiAgentToolAction implements IRavenObject {
    public constructor(name?: string, description?: string) {
        if (name) this.name = name;
        if (description) this.description = description;
    }

    /**
     * The name of the tool action.
     * This is the function identifier that the AI uses when invoking the tool.
     */
    public name: string;

    /**
     * The description of the tool action.
     * Helps the AI understand when and why to use this action.
     */
    public description: string;

    /**
     * A sample object representing the parameters for this tool.
     * This should be a JSON-formatted string, showing an example of valid parameters.
     */
    public parametersSampleObject: string;

    /**
     * The JSON schema for the parameters expected by this tool.
     * This schema is used to validate and assist the AI in forming correct tool calls.
     */
    public parametersSchema: string;
}
