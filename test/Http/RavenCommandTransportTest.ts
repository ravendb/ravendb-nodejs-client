import assert from "node:assert";
import { createServer, Server } from "node:http";
import { AddressInfo } from "node:net";
import { Agent } from "undici";
import { HeadDocumentCommand } from "../../src/Documents/Commands/HeadDocumentCommand.js";
import { ServerNode } from "../../src/Http/ServerNode.js";

describe("RavenCommand Node transport", function () {

    let server: Server;
    let agent: Agent;
    let node: ServerNode;

    beforeEach(async function () {
        server = createServer((req, res) => {
            res.writeHead(200, { "Content-Encoding": "gzip", "ETag": "\"A:1\"" });
            res.end();
        });
        await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
        const { port } = server.address() as AddressInfo;
        node = new ServerNode({ url: `http://127.0.0.1:${port}`, database: "db" });
        agent = new Agent();
    });

    afterEach(async function () {
        await agent.close();
        await new Promise(resolve => server.close(resolve));
    });

    it("does not decode a HEAD response that declares a content encoding", async function () {
        const command = new HeadDocumentCommand("users/1", null);

        const { response, bodyStream } = await command.send(agent, command.createRequest(node));

        assert.strictEqual(response.status, 200);
        const chunks: Buffer[] = [];
        for await (const chunk of bodyStream) {
            chunks.push(chunk);
        }
        assert.strictEqual(Buffer.concat(chunks).length, 0);
    });
});
