import assert from "node:assert";
import {Readable} from "node:stream";
import {assertThat} from "../../../Utils/AssertExtensions.js";
import {DocumentConventions} from "../../../../src/Documents/Conventions/DocumentConventions.js";
import {RunConversationOperation} from "../../../../src/Documents/Operations/AI/Agents/RunConversationOperation.js";
import {RavenTestContext} from "../../../Utils/TestUtil.js";
import {ServerNode} from "../../../../src/Http/ServerNode.js";
import type {AiOutputOptions} from "../../../../src/Documents/Operations/AI/AiOutputOptions.js";
import type {AiStreamCallback} from "../../../../src/Documents/Operations/AI/AiStreamCallback.js";

(RavenTestContext.isRavenDbServerVersion("7.1") ? describe : describe.skip)("AiConversationTest", () => {
    it("should parse streaming response correctly", async () => {
        const streamingResponse = `"Hello"
"World"
"!"
{"conversationId":"conv/1-A","response":{"message":"Hello World!"},"changeVector":"A:1-xyz","actionRequests":[]}
`;

        const receivedChunks: string[] = [];
        const streamCallback = async (chunk: string) => {
            receivedChunks.push(chunk);
        };

        const operation = new RunConversationOperation<{ message: string }>(
            "agents/1-A",
            "conv/1|",
            "Test prompt",
            [],
            [],
            undefined,
            undefined,
            undefined,
            "message",
            streamCallback
        );

        const conventions = new DocumentConventions();
        const command = operation.getCommand(conventions);

        const bodyStream = Readable.from([streamingResponse]);

        await command.setResponseAsync(bodyStream, false);

        assertThat(receivedChunks).hasSize(3);
        assertThat(receivedChunks[0]).isEqualTo("Hello");
        assertThat(receivedChunks[1]).isEqualTo("World");
        assertThat(receivedChunks[2]).isEqualTo("!");

        assertThat(command.result).isNotNull();
        assertThat(command.result.conversationId).isEqualTo("conv/1-A");
        assertThat(command.result.response).isNotNull();
        assertThat(command.result.response.message).isEqualTo("Hello World!");
    });

    it("should handle non-streaming response correctly", async () => {
        const normalResponse = `{"conversationId":"conv/2-A","response":{"message":"Direct"},"changeVector":"A:2-xyz","actionRequests":[]}`;

        const operation = new RunConversationOperation<{ message: string }>(
            "agents/1-A",
            "conv/2|",
            "Test prompt",
        );

        const conventions = new DocumentConventions();
        const command = operation.getCommand(conventions);

        const bodyStream = Readable.from([normalResponse]);

        await command.setResponseAsync(bodyStream, false);

        assertThat(command.result).isNotNull();
        assertThat(command.result.conversationId).isEqualTo("conv/2-A");
        assertThat(command.result.response.message).isEqualTo("Direct");
    });

    it("should handle empty lines in streaming response", async () => {
        const streamingResponse = `"Chunk1"

"Chunk2"

{"conversationId":"conv/3-A","response":{"text":"Done"},"changeVector":"A:3-xyz","actionRequests":[]}
`;

        const receivedChunks: string[] = [];
        const streamCallback = async (chunk: string) => {
            receivedChunks.push(chunk);
        };

        const operation = new RunConversationOperation<{ text: string }>(
            "agents/1-A",
            "conv/3|",
            "Test",
            [],
            [],
            undefined,
            undefined,
            undefined,
            "text",
            streamCallback
        );

        const conventions = new DocumentConventions();
        const command = operation.getCommand(conventions);
        const bodyStream = Readable.from([streamingResponse]);

        await command.setResponseAsync(bodyStream, false);

        assertThat(receivedChunks).hasSize(2);
        assertThat(receivedChunks[0]).isEqualTo("Chunk1");
        assertThat(receivedChunks[1]).isEqualTo("Chunk2");
    });

    function requestFor(outputOptions?: AiOutputOptions, streamPropertyPath?: string, streamCallback?: AiStreamCallback) {
        const operation = new RunConversationOperation<unknown>(
            "agents/1-A",
            "conv/4|",
            "Test prompt",
            [],
            [],
            undefined,
            undefined,
            undefined,
            streamPropertyPath,
            streamCallback,
            outputOptions
        );

        const command = operation.getCommand(new DocumentConventions());
        const request = command.createRequest(new ServerNode({ url: "http://localhost:8080", database: "db" }));
        const body = JSON.parse(request.body as string);
        return { command, request, body };
    }

    it("should not send OutputOptions when none are given", () => {
        const { body } = requestFor();

        assertThat(body.OutputOptions).isUndefined();
    });

    it("should not send OutputOptions when the options object has nothing set", () => {
        const { body } = requestFor({});

        assertThat(body.OutputOptions).isUndefined();
    });

    it("should send the sample object as a JSON string in OutputOptions", () => {
        const { body } = requestFor({ sampleObject: { summary: "a short summary", score: 5 } });

        assertThat(body.OutputOptions).isNotNull();
        assertThat(typeof body.OutputOptions.SampleObject).isEqualTo("string");
        assert.deepStrictEqual(JSON.parse(body.OutputOptions.SampleObject), { summary: "a short summary", score: 5 });
        assertThat(body.OutputOptions.OutputSchema).isUndefined();
        assertThat(body.OutputOptions.NoSchema).isUndefined();
    });

    it("should send an explicit output schema in OutputOptions", () => {
        const schema = `{"type":"object","properties":{"summary":{"type":"string"}}}`;
        const { body } = requestFor({ outputSchema: schema });

        assertThat(body.OutputOptions.OutputSchema).isEqualTo(schema);
        assertThat(body.OutputOptions.SampleObject).isUndefined();
        assertThat(body.OutputOptions.NoSchema).isUndefined();
    });

    it("should send NoSchema only when true", () => {
        const { body } = requestFor({ noSchema: true });

        assertThat(body.OutputOptions.NoSchema).isTrue();
        assertThat(body.OutputOptions.SampleObject).isUndefined();
        assertThat(body.OutputOptions.OutputSchema).isUndefined();

        const { body: notSet } = requestFor({ noSchema: false, outputSchema: "{}" });
        assertThat(notSet.OutputOptions.NoSchema).isUndefined();
    });

    it("should enable streaming with an empty property path for raw text answers", () => {
        const { request } = requestFor({ noSchema: true }, "", async () => { /* no-op */ });

        const uri = new URL(request.uri);
        assertThat(uri.searchParams.get("streaming")).isEqualTo("true");
        assertThat(uri.searchParams.get("streamPropertyPath")).isEqualTo("");
    });

    it("should not enable streaming without a property path", () => {
        const { request } = requestFor();

        const uri = new URL(request.uri);
        assertThat(uri.searchParams.has("streaming")).isFalse();
        assertThat(uri.searchParams.has("streamPropertyPath")).isFalse();
    });

    it("should parse a raw string response", async () => {
        const rawResponse = `{"conversationId":"conv/5-A","response":"plain text answer","changeVector":"A:5-xyz","actionRequests":[]}`;

        const operation = new RunConversationOperation<string>(
            "agents/1-A",
            "conv/5|",
            "Test prompt",
            [],
            [],
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            { noSchema: true }
        );

        const command = operation.getCommand(new DocumentConventions());
        await command.setResponseAsync(Readable.from([rawResponse]), false);

        assertThat(command.result.conversationId).isEqualTo("conv/5-A");
        assertThat(command.result.response).isEqualTo("plain text answer");
    });

    it("should stream raw text chunks and return the full text as the response", async () => {
        const streamingResponse = `"Hello"
" world"
{"conversationId":"conv/6-A","response":"Hello world","changeVector":"A:6-xyz","actionRequests":[]}
`;

        const receivedChunks: string[] = [];
        const { command } = requestFor({ noSchema: true }, "", async chunk => {
            receivedChunks.push(chunk);
        });

        await command.setResponseAsync(Readable.from([streamingResponse]), false);

        assert.deepStrictEqual(receivedChunks, ["Hello", " world"]);
        assertThat(command.result.response).isEqualTo("Hello world");
    });
});
