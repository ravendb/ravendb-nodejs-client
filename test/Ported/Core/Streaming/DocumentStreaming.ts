import { testContext, disposeTestDocumentStore } from "../../../Utils/TestUtil";

import {
    IDocumentStore,
    StreamResult,
} from "../../../../src";
import * as assert from "assert";
import * as StreamUtil from "../../../../src/Utility/StreamUtil";
import {User} from "../../../Assets/Entities";
import { CONSTANTS } from "../../../../src/Constants";

describe("document streaming", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function argError(): never {
        throw new Error("Arg is required.");
    }

    async function prepareData(n: number = argError()) {
        const session = store.openSession();

        for (let i = 0; i < n; i++) {
            await session.store(Object.assign(new User(), {
                name: "jon" + i,
                lastName: "snow" + i
            }));
        }
        await session.saveChanges();
    }

    it("can stream documents starting with", async () => {
        await prepareData(200);

        {
            const session = store.openSession();

            const queryStream = await session.advanced.stream<User>("users/");

            const items = [];
            queryStream.on("data", item => {
                items.push(item);
            });

            await StreamUtil.finishedAsync(queryStream);

            assert.strictEqual(items.length, 200);
            items.forEach(item => {
                assertStreamResultEntry(item, (doc: any) => {
                    assert.ok(doc);
                    assert.ok(doc.name);
                    assert.ok(doc.lastName);
                });
            });
        }
    });

    it("[TODO] can stream starting with prefix using opts");

    it("can stream without iteration does not leak connection", async () => {
        await prepareData(200);
        for (let i = 0; i < 5; i++) {
            {
                const session = store.openSession();
                await session.advanced.stream<User>("users/");
            }
        }
    });
    
    function assertStreamResultEntry<T extends object>(
        entry: StreamResult<T>, docAssert: (doc: T) => void) {
        assert.ok(entry);
        assert.strictEqual(entry.constructor.name, Object.name);
        assert.ok(entry.changeVector);
        assert.ok(entry.id);
        assert.ok(entry.metadata);
        assert.ok(entry.metadata[CONSTANTS.Documents.Metadata.ID]);
        assert.ok(entry.metadata[CONSTANTS.Documents.Metadata.RAVEN_JS_TYPE]);
        assert.ok(entry.metadata[CONSTANTS.Documents.Metadata.LAST_MODIFIED]);
        
        const doc = entry.document;
        assert.ok(doc);
        docAssert(doc);
    }
});
