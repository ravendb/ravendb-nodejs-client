import assert from "node:assert";
import { Buffer } from "node:buffer";
import { Readable } from "node:stream";
import { SingleNodeBatchCommand } from "../../../src/Documents/Commands/Batches/SingleNodeBatchCommand.js";
import { PutAttachmentCommandData } from "../../../src/Documents/Commands/Batches/PutAttachmentCommandData.js";
import { DocumentConventions } from "../../../src/Documents/Conventions/DocumentConventions.js";
import { ServerNode } from "../../../src/Http/ServerNode.js";

describe("SingleNodeBatchCommand", function () {

    it("sends attachments as a multipart body with byte-exact attachment parts", async function () {
        const binaryPayload = Buffer.from(Array.from({ length: 256 }, (_, i) => i));
        const streamPayload = Buffer.from("streamed attachment");

        const command = new SingleNodeBatchCommand(DocumentConventions.defaultConventions, [
            new PutAttachmentCommandData("users/1", "binary", binaryPayload, "application/octet-stream", null),
            new PutAttachmentCommandData("users/1", "stream", Readable.from([streamPayload]), "text/plain", null)
        ]);

        const request = command.createRequest(new ServerNode({ url: "http://localhost:8080", database: "db" }));

        let sentBody: Buffer;
        let sentContentType: string;
        request.headers = {};
        request.fetcher = async (_uri: string, init: RequestInit) => {
            sentBody = init.body as Buffer;
            sentContentType = init.headers["Content-Type"];
            return new Response("{}");
        };

        await command.send(null, request);

        const boundary = /^multipart\/form-data; boundary=(.+)$/.exec(sentContentType)?.[1];
        assert.ok(boundary, "boundary is declared in Content-Type");

        const form = await new Response(sentBody, { headers: { "Content-Type": sentContentType } }).formData();
        const main = JSON.parse(form.get("main") as string);
        assert.deepStrictEqual(main.Commands.map(x => x.Name), ["binary", "stream"]);
        assert.deepStrictEqual([...form.keys()], ["main", "attachment_0", "attachment_1"]);

        [binaryPayload, streamPayload].forEach((payload, index) => {
            const expectedPart = Buffer.concat([
                Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="attachment_${index}"\r\n`
                    + "Command-Type: AttachmentStream\r\nContent-Type: application/octet-stream\r\n\r\n"),
                payload,
                Buffer.from(`\r\n--${boundary}`)
            ]);
            assert.ok(sentBody.includes(expectedPart), `attachment_${index} part is byte-exact`);
        });
    });
});
