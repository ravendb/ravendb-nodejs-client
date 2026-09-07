export type JsonPatchOperationType = "add" | "remove" | "replace" | "move" | "copy" | "test";

/**
 * A single RFC 6902 operation. Property names match the wire format the server expects
 * ("op", "path", "value", "from").
 */
export interface JsonPatchOperation {
    op: JsonPatchOperationType;
    path: string;
    value?: unknown;
    from?: string;
}

/**
 * RFC 6902 JSON Patch document: an ordered list of operations applied to one document.
 * Paths are RFC 6901 JSON pointers ("/tags/0", "/address/city"); "-" appends to an array ("/tags/-").
 * Send it with `session.advanced.defer(new JsonPatchCommandData(id, document))`.
 */
export class JsonPatchDocument {
    public readonly operations: JsonPatchOperation[] = [];

    public add(path: string, value: unknown): this {
        this.operations.push({ op: "add", path, value });
        return this;
    }

    public remove(path: string): this {
        this.operations.push({ op: "remove", path });
        return this;
    }

    public replace(path: string, value: unknown): this {
        this.operations.push({ op: "replace", path, value });
        return this;
    }

    public move(from: string, path: string): this {
        this.operations.push({ op: "move", from, path });
        return this;
    }

    public copy(from: string, path: string): this {
        this.operations.push({ op: "copy", from, path });
        return this;
    }

    public test(path: string, value: unknown): this {
        this.operations.push({ op: "test", path, value });
        return this;
    }
}
