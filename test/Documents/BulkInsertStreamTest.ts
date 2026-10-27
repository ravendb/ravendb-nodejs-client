import assert from "node:assert";
import { BulkInsertStream } from "../../src/Documents/BulkInsert/BulkInsertWriterBase.js";

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

    it("passes large buffers through without copying them", () => {
        const large = Buffer.alloc(2 * 1024 * 1024, 7);
        const stream = new BulkInsertStream();
        stream.push("{\"Id\":\"users/1\"}");
        stream.push(large);
        stream.push(",");
        stream.push("]");

        const buffers = stream.toBuffers();

        assert.strictEqual(buffers.length, 3);
        assert.strictEqual(buffers[0].toString(), "{\"Id\":\"users/1\"}");
        assert.strictEqual(buffers[1], large);
        assert.strictEqual(buffers[2].toString(), ",]");
    });
});
