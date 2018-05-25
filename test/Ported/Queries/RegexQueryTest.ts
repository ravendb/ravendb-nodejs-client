import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
} from "../../../src";

describe("Regex query", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    beforeEach(async () => {
        const session = store.openSession();
        await session.store(new RegexMe("I love dogs and cats"));
        await session.store(new RegexMe("I love cats"));
        await session.store(new RegexMe("I love dogs"));
        await session.store(new RegexMe("I love bats"));
        await session.store(new RegexMe("dogs love me"));
        await session.store(new RegexMe("cats love me"));
        await session.saveChanges();
    });

    it("can do queries with regex from documentQuery", async () => {
        const session = store.openSession();
        const query = session.
            advanced
            .documentQuery(RegexMe)
            .whereRegex("text", "^[a-z ]{2,4}love");

        const iq = query.getIndexQuery();

        assert.equal(iq.query, "from RegexMes where regex(text, $p0)");

        assert.equal(iq.queryParameters["p0"], "^[a-z ]{2,4}love");

        const result = await query.all();
        assert.equal(result.length, 4);
    });
});

class RegexMe {
    private text: string;

    public constructor(text?: string) {
        this.text = text;
    }
}
