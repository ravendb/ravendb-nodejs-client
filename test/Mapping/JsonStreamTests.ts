import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import * as JSONStream from "JSONStream";
import * as stream from "readable-stream";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RavenErrorType,
    IDocumentStore,
} from "../../src";

describe("JSONStream", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can parse BatchCommand response just fine", (done) => {
        const json = `{"Results":[{"Type":"PUT","@id":"users/1","@collection":"Users","@change-vector":"A:1-2ZYfAzcv8Ee+U/12oFmTJQ","@last-modified":"2018-08-22T06:10:29.8004542"}]}`;
        const readable = new stream.Readable();
        readable.push(json);
        readable.push(null);

        readable.pipe(JSONStream.parse())
            .on("data", obj => {
                assert.equal("PUT", obj.Results[0].Type);
                assert.ok("users/1", obj.Results[0]["@id"]);
            })
            .on("error", done)
            .on("end", () => {
                done();
            });

    });
});
