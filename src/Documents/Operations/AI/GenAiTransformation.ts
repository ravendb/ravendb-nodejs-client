/**
 * Represents a transformation script for GenAI ETL.
 * The script is used to extract context from documents before sending to the AI model.
 */
export class GenAiTransformation {
    /**
     * JavaScript transformation script that extracts context from documents.
     * Must call ai.genContext(ctx) to provide context to the AI.
     */
    public script: string;

    /**
     * Validates that the transformation script contains the required ai.genContext call.
     * @returns Error message if validation fails, null if valid
     */
    public validateScript(): string | null {
        if (!this.script) {
            return "Script cannot be empty";
        }

        if (this.script.includes("ai.genContext")) {
            return null;
        }

        return "You must call the ai.genContext(ctx) function in your script";
    }
}

