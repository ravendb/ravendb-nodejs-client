/**
 * Controls the output format for a single AI conversation turn.
 *
 * A default output schema must still be provided when creating the agent (via `store.ai.createAgent()`).
 * `AiOutputOptions` lets you override that default on a per-call basis: the options set here
 * take precedence over the agent-level schema for the duration of that turn only.
 *
 * Set exactly one of `sampleObject`, `outputSchema` or `noSchema`. When several are set the server
 * applies `noSchema` first, then `outputSchema`, then `sampleObject`.
 *
 * @example
 * ```typescript
 * // derive the schema from a sample object for this turn only
 * const answer = await chat.run<Summary>({ sampleObject: { summary: "a short summary", score: 5 } });
 *
 * // free-form text answer, no structured output
 * const text = await chat.run({ noSchema: true });
 * ```
 */
export interface AiOutputOptions {
    /**
     * A sample object used to generate a JSON schema for structured output.
     * The server converts it to a JSON schema at request time.
     * Must match the `TAnswer` type used in the conversation call.
     */
    sampleObject?: object;

    /**
     * An explicit output schema for structured output, as a JSON string.
     * The server forwards it verbatim as the model's `response_format.json_schema`, so it must be the
     * OpenAI-style wrapper `{ "name": "...", "strict": true, "schema": { ...JSON schema... } }`, not a bare
     * JSON schema (a bare schema is ignored by the model and the turn fails to parse).
     * Takes precedence over `sampleObject` if both are set.
     *
     * @example
     * ```typescript
     * outputSchema: JSON.stringify({
     *     name: "rating",
     *     strict: true,
     *     schema: { type: "object", properties: { score: { type: "number" } }, required: ["score"], additionalProperties: false }
     * })
     * ```
     */
    outputSchema?: string;

    /**
     * When true, disables structured output entirely.
     * The LLM returns free-form text instead of JSON conforming to a schema,
     * and the answer is a plain string.
     */
    noSchema?: boolean;
}
