import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";
import { Company } from "../Assets/Entities";
import { delay } from "../../src/Utility/PromiseUtil";

describe("RavenDB_11770Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetRevisionsByDate", async () => {
        const id = "users/1";
        await testContext.setupRevisions(store, false, 100);
        
        {
            const session = store.openSession();
            const company = Object.assign(new Company(), { name: "Fitzchak" });
            await session.store(company, id);
            await session.saveChanges();
        }

        await delay(2);

        const fst = new Date();

        for (let i = 0; i < 3; i++) {
            {
                const session = store.openSession();
                const company = await session.load<Company>(id);
                company.name = "Fitzchak" + i;
                await session.saveChanges();

                await delay(2);
            }
        }

        const snd = new Date();

        for (let i = 0; i < 3; i++) {
            {
                const session = store.openSession();
                const company = await session.load<Company>(id);
                company.name = "Oren" + i;
                await session.saveChanges();
            }

            await delay(2);
        }

        {
            const session = store.openSession();
            const rev1 = await session.advanced.revisions.get<Company>(id, fst);
            assert.ok(rev1);
            assert.strictEqual(rev1.name, "Fitzchak");

            const rev2 = await session.advanced.revisions.get<Company>(id, snd);
            assert.strictEqual(rev2.name, "Fitzchak2");

            const rev3 = await session.advanced.revisions.get<Company>(id, new Date());
            assert.strictEqual(rev3.name, "Oren2");
        }
    });
});
