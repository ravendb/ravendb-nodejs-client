import assert from "node:assert";
import { once } from "node:events";
import { PassThrough } from "node:stream";
import { RavenCommand } from "../../src/Http/RavenCommand.js";

const toWebStream: (stream: PassThrough) => ReadableStream<Uint8Array> = (RavenCommand as any)._toWebStream;

describe("RavenCommand._toWebStream", function () {

    it("passes the same buffers through and closes on end", async () => {
        const chunk = Buffer.from("payload");
        const source = new PassThrough();
        const reader = toWebStream(source).getReader();

        source.end(chunk);

        const first = await reader.read();
        assert.strictEqual(first.value, chunk);
        assert.strictEqual((await reader.read()).done, true);
    });

    it("pauses the source until the consumer pulls again", async () => {
        const source = new PassThrough();
        const reader = toWebStream(source).getReader();

        source.write(Buffer.from("a"));
        await reader.read();

        assert.strictEqual(source.isPaused(), true);
    });

    it("errors the web stream when the source fails", async () => {
        const source = new PassThrough();
        const reader = toWebStream(source).getReader();

        source.destroy(new Error("boom"));

        await assert.rejects(reader.read(), { message: "boom" });
    });

    it("destroys the source when the web stream is cancelled", async () => {
        const source = new PassThrough();
        const reader = toWebStream(source).getReader();
        const closed = once(source, "close");

        await reader.cancel();
        await closed;

        assert.strictEqual(source.destroyed, true);
    });
});
