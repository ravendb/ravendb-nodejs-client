import assert from "node:assert";
import { createServer, IncomingMessage, Server, ServerResponse } from "node:http";
import { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import { gzipSync, zstdCompressSync } from "node:zlib";
import { Agent } from "undici";
import { HeadDocumentCommand } from "../../src/Documents/Commands/HeadDocumentCommand.js";
import { RavenCommand, RavenCommandResponseType } from "../../src/Http/RavenCommand.js";
import { ServerNode } from "../../src/Http/ServerNode.js";
import { HttpRequestParameters } from "../../src/Primitives/Http.js";

class GetCommand extends RavenCommand<unknown> {
    public constructor(responseType: RavenCommandResponseType) {
        super();
        this._responseType = responseType;
    }

    public get isReadRequest(): boolean {
        return true;
    }

    public createRequest(node: ServerNode): HttpRequestParameters {
        return { method: "GET", uri: node.url + "/databases/" + node.database + "/test" };
    }
}

async function readText(stream: Readable): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf8");
}

describe("RavenCommand Node transport", function () {

    let server: Server;
    let agent: Agent;
    let node: ServerNode;
    let respond: (req: IncomingMessage, res: ServerResponse) => void;

    const payload = { name: "x".repeat(2048), items: [1, 2, 3] };

    function respondEncoded(encoding: string, body: Buffer, status = 200) {
        respond = (req, res) => {
            res.writeHead(status, { "Content-Encoding": encoding });
            res.end(body);
        };
    }

    beforeEach(async function () {
        respond = (req, res) => {
            res.writeHead(200, { "Content-Encoding": "gzip", "ETag": "\"A:1\"" });
            res.end();
        };
        server = createServer((req, res) => respond(req, res));
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

    for (const [encoding, compress] of [["gzip", gzipSync], ["zstd", zstdCompressSync]] as const) {
        it(`decodes a ${encoding} response of an Object command in one shot`, async function () {
            respondEncoded(encoding, compress(JSON.stringify(payload)));
            const command = new GetCommand("Object");

            const { bodyStream } = await command.send(agent, command.createRequest(node));

            assert.deepStrictEqual(JSON.parse(await readText(bodyStream)), payload);
        });

        it(`decodes a ${encoding} response of a Raw command as a stream`, async function () {
            respondEncoded(encoding, compress(JSON.stringify(payload)));
            const command = new GetCommand("Raw");

            const { bodyStream } = await command.send(agent, command.createRequest(node));

            assert.deepStrictEqual(JSON.parse(await readText(bodyStream)), payload);
        });
    }

    it("decodes a gzip response of an Empty command as a stream", async function () {
        respondEncoded("gzip", gzipSync("done"));
        const command = new GetCommand("Empty");

        const { bodyStream } = await command.send(agent, command.createRequest(node));

        assert.strictEqual(await readText(bodyStream), "done");
    });

    for (const status of [204, 304]) {
        it(`does not decode a ${status} response that declares a content encoding`, async function () {
            respondEncoded("gzip", Buffer.alloc(0), status);
            const command = new GetCommand("Object");

            const { response, bodyStream } = await command.send(agent, command.createRequest(node));

            assert.strictEqual(response.status, status);
            assert.strictEqual(await readText(bodyStream), "");
        });
    }

    it("reports a connection reset like a fetch network failure", async function () {
        respond = req => req.socket.destroy();
        const command = new GetCommand("Object");

        await assert.rejects(command.send(agent, command.createRequest(node)), (err: Error) => {
            assert.ok(err instanceof TypeError);
            assert.strictEqual(err.message, "fetch failed");
            assert.ok(err.cause);
            return true;
        });
    });
});
