/**
 * Callback invoked with each streamed chunk from the AI agent response.
 * The callback can be synchronous or asynchronous.
 *
 * @param chunk - The streamed text chunk from the specified property
 * @returns A promise (for async callbacks) or void (for sync callbacks)
 */
export type AiStreamCallback = (chunk: string) => Promise<void> | void;
