import assert from "node:assert";
import { BulkInsertStream } from "../../src/Documents/BulkInsert/BulkInsertWriterBase.js";
import { RuntimeUtil } from "../../src/Utility/RuntimeUtil.js";

describe("BulkInsertStream", function () {

    it("concatenates small items into one buffer", () => {
        const stream = new BulkInsertStream();
        stream.push("[");
        stream.push(Buffer.from([1, 2, 3]));
        stream.push("ż");

        const buffers = stream.toBuffers();

        assert.strictEqual(buffers.length, 1);
        assert.deepStrictEqual(buffers[0], Buffer.concat([Buffer.from("["), Buffer.from([1, 2, 3]), Buffer.from("ż")]));
    });

    it("passes large buffers through without copying them on Node", () => {
        const large = Buffer.alloc(2 * 1024 * 1024, 7);
        const stream = new BulkInsertStream();
        stream.push("{\"Id\":\"users/1\"}");
        stream.push(large);
        stream.push(",");
        stream.push("]");

        const buffers = stream.toBuffers();

        if (!RuntimeUtil.supportsUndiciDispatcher()) {
            assert.strictEqual(buffers.length, 1);
            assert.ok(buffers[0].equals(Buffer.concat([Buffer.from("{\"Id\":\"users/1\"}"), large, Buffer.from(",]")])));
            return;
        }

        assert.strictEqual(buffers.length, 3);
        assert.strictEqual(buffers[0].toString(), "{\"Id\":\"users/1\"}");
        assert.strictEqual(buffers[1], large);
        assert.strictEqual(buffers[2].toString(), ",]");
    });

    it("passes a buffer of exactly 1 MB through on Node", () => {
        const boundary = Buffer.alloc(1024 * 1024, 7);
        const stream = new BulkInsertStream();
        stream.push("[");
        stream.push(boundary);

        const buffers = stream.toBuffers();

        if (!RuntimeUtil.supportsUndiciDispatcher()) {
            assert.strictEqual(buffers.length, 1);
            return;
        }

        assert.strictEqual(buffers.length, 2);
        assert.strictEqual(buffers[0].toString(), "[");
        assert.strictEqual(buffers[1], boundary);
    });

    it("passes adjacent large buffers through without an empty buffer between them on Node", () => {
        const first = Buffer.alloc(2 * 1024 * 1024, 1);
        const second = Buffer.alloc(2 * 1024 * 1024, 2);
        const stream = new BulkInsertStream();
        stream.push(first);
        stream.push(second);

        const buffers = stream.toBuffers();

        if (!RuntimeUtil.supportsUndiciDispatcher()) {
            assert.strictEqual(buffers.length, 1);
            return;
        }

        assert.strictEqual(buffers.length, 2);
        assert.strictEqual(buffers[0], first);
        assert.strictEqual(buffers[1], second);
    });
});
