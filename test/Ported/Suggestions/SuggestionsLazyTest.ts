import * as assert from "assert";

import { IDocumentStore, IndexDefinition, IndexFieldOptions, PutIndexesOperation } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";

describe("SuggestionsLazyTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("using linq", async () => {
        const indexDefinition = new IndexDefinition();
        indexDefinition.name = "Test";
        indexDefinition.maps = new Set<string>(["from doc in docs.Users select new { doc.name }"]);

        const indexFieldOptions = new IndexFieldOptions();
        indexFieldOptions.suggestions = true;
        indexDefinition.fields = {
            name: indexFieldOptions
        };

        await store.maintenance.send(new PutIndexesOperation(indexDefinition));

        {
            const s = store.openSession();

            const user1 = new User();
            user1.name = "Ayende";
            await s.store(user1);

            const user2 = new User();
            user2.name = "Oren";
            await s.store(user2);

            await s.saveChanges();
        }

        await testContext.waitForIndexing(store);

        {
            const s = store.openSession();
            const oldRequests = s.advanced.numberOfRequests;

            const suggestionQueryResult = s.query<User>({
                indexName: "test",
                documentType: User
            })
                .suggestUsing(x => x.byField("name", "Owen"))
                .executeLazy();

            assert.strictEqual(s.advanced.numberOfRequests, oldRequests);

            const value = await suggestionQueryResult.getValue();
            assert.strictEqual(value["name"].suggestions.length, 1);

            assert.strictEqual(value["name"].suggestions[0], "oren");

            assert.strictEqual(s.advanced.numberOfRequests, oldRequests + 1);
        }
    });
});
