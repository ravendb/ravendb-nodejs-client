import assert from "node:assert";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { ResultsArrayItemsStream } from "../../src/Mapping/Json/Streams/ResultsArrayItemsStream.js";

async function readItems(chunks: Buffer[]) {
    const items: any[] = [];
    const splitter = new ResultsArrayItemsStream();
    splitter.on("data", item => items.push(item));
    await pipeline(Readable.from(chunks), splitter);
    return items;
}

describe("ResultsArrayItemsStream", function () {

    it("emits each item and accepts the comma after the last one", async () => {
        const items = await readItems([Buffer.from(`{"Results":[{"Tag":"a","Values":[1.0]},{"Tag":"b","Values":[2.0,3.0]},]}`)]);

        assert.deepStrictEqual(items, [{ Tag: "a", Values: [1] }, { Tag: "b", Values: [2, 3] }]);
    });

    it("keeps items split across chunks, including inside strings and multi-byte characters", async () => {
        const bytes = Buffer.from(`{"Results":[{"Tag":"x ]}{\\" ż","Values":[1.0]},]}`);
        const items = await readItems([...bytes].map(b => Buffer.from([b])));

        assert.deepStrictEqual(items, [{ Tag: "x ]}{\" ż", Values: [1] }]);
    });

    it("emits nothing for an empty array", async () => {
        assert.deepStrictEqual(await readItems([Buffer.from(`{"Results":[]}`)]), []);
    });

    it("fails on a truncated response", async () => {
        await assert.rejects(() => readItems([Buffer.from(`{"Results":[{"Tag":"a"`)]), /Unexpected end/);
    });
});
