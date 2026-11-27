import assert from "node:assert"
import { milliseconds } from "date-fns";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil.js";

import {
    IDocumentStore,
} from "../../../src/index.js";

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
        const query = session.query(RegexMe)
            .whereRegex("text", "^[a-z ]{2,4}love");

        const iq = query.getIndexQuery();

        assert.strictEqual(iq.query, "from 'RegexMes' where regex(text, $p0)");

        assert.strictEqual(iq.queryParameters["p0"], "^[a-z ]{2,4}love");

        const result = await query.all();
        assert.strictEqual(result.length, 4);
    });

    it("queries with regex should work", async () => {
        const session = store.openSession();
        const res = await session.advanced
            .rawQuery("from RegexMes as r where Regex(r.text,\"^[a-z ]{2,4}love\")", RegexMe)
            .waitForNonStaleResults(milliseconds({ minutes: 3 }))
            .all();
        assert.strictEqual(res.length, 4);
    });

    it("queries with regex and escaped chars should work", async () => {
        const session = store.openSession();
        const res = await session.advanced
            .rawQuery("from RegexMes as r where Regex(r.text,\"^(\\\\w+\\\\s+){4}\\\\w+$\")", RegexMe)
            .waitForNonStaleResults(milliseconds({ minutes: 3 }))
            .all();
        assert.strictEqual(res.length, 1);
    });
});

class RegexMe {
    private text: string;

    public constructor(text?: string) {
        this.text = text;
    }
}
