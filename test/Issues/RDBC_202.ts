
import {
    IDocumentStore,
    DocumentStore,
} from "../../src";
import { IAuthOptions } from "../../src/Auth/AuthOptions";
import * as assert from "assert";

describe("DocumentStore", function () {

    it("allows to pass authOptions as a third param in DocumentStore constructor", () => {
        const authOptions: IAuthOptions = {};
        const store = new DocumentStore("https://test.com", "db", authOptions);
        assert.strictEqual(store.authOptions, authOptions);
    });
    
});
