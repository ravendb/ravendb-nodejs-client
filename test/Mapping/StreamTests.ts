import * as stream from "readable-stream";
import * as assert from "assert";
import { parser } from "stream-json/Parser";
import { pick } from "stream-json/filters/Pick";
import { ignore } from "stream-json/filters/Ignore";
import { streamArray } from "stream-json/streamers/StreamArray";
import { streamObject } from "stream-json/streamers/StreamObject";
import { streamValues } from "stream-json/streamers/StreamValues";

describe("streaming tryouts", function () {

    it("can stream array with nulls", (done) => {
        const readable = new stream.Readable();
        readable.push(`{"Results":[null,null],"Includes":{}}`);
        readable.push(null);

        stream.pipeline([
            readable,
            parser(),
            pick({ filter: "Results" }),
            streamArray()
        ], (err) => {
            if (err) {
                done(err);
                return;
            }

            done();
        })
            .on("data", x => assert.strictEqual(x["value"], null));
    });
});
