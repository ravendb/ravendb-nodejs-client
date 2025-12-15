import {Readable} from "node:stream";
import {assertThat} from "../../../Utils/AssertExtensions.js";
import {DocumentConventions} from "../../../../src/Documents/Conventions/DocumentConventions.js";
import {RunConversationOperation} from "../../../../src/Documents/Operations/AI/Agents/RunConversationOperation.js";
import {RavenTestContext} from "../../../Utils/TestUtil.js";

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
});
