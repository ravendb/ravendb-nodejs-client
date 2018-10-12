import * as fs from "fs";
import * as path from "path";
import * as stream from "readable-stream";
import * as assert from "assert";
import * as Parser from "stream-json/Parser";
import * as StreamValues from "stream-json/streamers/StreamValues";
import { stringer } from "stream-json/Stringer";

describe("stream-json parser and stringer", function () {

    it("stringer using values can stringify negative numbers when parser packing keys", (done) => {

        const content = `{"test":-1}`;
        const readable = new stream.Readable();
        readable.push(content);
        readable.push(null);

        const parser = new Parser({
            streamValues: false 
        });

        let hasNumberChunk = false;
        parser.on("data", x => hasNumberChunk = hasNumberChunk || x.name === "numberChunk");

        const stringerInstance = stringer({ useValues: true });
        let output = "";
        stringerInstance.on("data", data => output += data.toString());

        stream.pipeline(
            readable,
            parser,
            stringerInstance, 
            (err) => {
                err ? done(err) : done();
                assert.strictEqual(output, content);
            });
    });

    it("parser with streamNumbers turned off should not emit 'numberChunk' tokens", (done) => {

        const content = `{ "test": -1 }`;
        const readable = new stream.Readable();
        readable.push(content);
        readable.push(null);

        const parser = new Parser({
            streamValues: false
        });

        let hasNumberChunk = false;
        parser.on("data", x => hasNumberChunk = hasNumberChunk || x.name === "numberChunk");

        stream.pipeline(
            readable,
            parser,
            (err) => {
                err ? done(err) : done();
                assert.ok(!hasNumberChunk);
            });
    });

    it("stringer for query result response with negative result etag", (done) => {
        const content = fs.readFileSync(path.join(__dirname, "../Assets/queryResult.json"), "utf-8");
        const readable = new stream.Readable();
        readable.push(content);
        readable.push(null);

        const parser = new Parser({
            streamValues: false
        });

        const stringerInstance = stringer({ useValues: true });
        let output = "";
        stringerInstance.on("data", data => output += data.toString());

        stream.pipeline(
            readable,
            parser,
            stringerInstance, 
            (err) => {
                err ? done(err) : done();
                assert.strictEqual(output, content);
            });
    });

    it("can handle multiple objects in one batch", (done) => {
        const content = `{"A":1}{"B":2}`;
        const readable = new stream.Readable();
        readable.push(content);
        readable.push(null);

        const parser = new Parser({ jsonStreaming: true, streamValues: false });

        const data = [];
        stream.pipeline(
            readable,
            parser,
            new StreamValues().on("data", d => data.push(d)),
            (err) => {
                err ? done(err) : done();
                assert.strictEqual(data.length, 2);
            });
    });
});
