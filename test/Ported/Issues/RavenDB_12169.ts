import * as mocha from "mocha";
import * as assert from "assert";
import { User, Company, Order } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    IDocumentStore,
    BatchPatchCommandData,
    PatchRequest,
} from "../../../src";

describe.only("RavenDB-12169", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        testContext.enableFiddler();
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("canUseBatchPatchCommand", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "C1" }), "companies/1");
            await session.store(Object.assign(new Company(), { name: "C2" }), "companies/2");
            await session.store(Object.assign(new Company(), { name: "C3" }), "companies/3");
            await session.store(Object.assign(new Company(), { name: "C4" }), "companies/4");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            
            const c1 = await session.load<Company>("companies/1");
            const c2 = await session.load<Company>("companies/2");
            const c3 = await session.load<Company>("companies/3");
            const c4 = await session.load<Company>("companies/4");

            assertThat(c1.name)
                .isEqualTo("C1");
            assertThat(c2.name)
                .isEqualTo("C2");
            assertThat(c3.name)
                .isEqualTo("C3");
            assertThat(c4.name)
                .isEqualTo("C4");

            const ids = [ c1.id, c3.id ];

            session.advanced.defer(
                new BatchPatchCommandData(
                    PatchRequest.forScript("this.name = 'test'; "), null, ...ids));

            session.advanced.defer(
                new BatchPatchCommandData(
                    PatchRequest.forScript("this.name = 'test2'; "), null, c4.id));

            await session.saveChanges();
        }

        {

            const session = store.openSession();
            const c1 = await session.load<Company>("companies/1");
            const c2 = await session.load<Company>("companies/2");
            const c3 = await session.load<Company>("companies/3");
            const c4 = await session.load<Company>("companies/4");

            assertThat(c1.name)
                .isEqualTo("test");
            assertThat(c2.name)
                .isEqualTo("C2");
            assertThat(c3.name)
                .isEqualTo("test");
            assertThat(c4.name)
                .isEqualTo("test2");
        }

        {
            const session = store.openSession();
            const c2 = await session.load<Company>("companies/2");
            
            session.advanced.defer(
                new BatchPatchCommandData(
                    PatchRequest.forScript("this.name = 'test2'"), null, { id: c2.id,  changeVector: "invalidCV" }));

            await assertThrows(async () => {
                await session.saveChanges();
            }, err => assert.strictEqual(err.name, "ConcurrencyException"));
        }

        {

            const session = store.openSession();
            const c1 = await session.load<Company>("companies/1");
            const c2 = await session.load<Company>("companies/2");
            const c3 = await session.load<Company>("companies/3");
            const c4 = await session.load<Company>("companies/4");
            assertThat(c1.name)
                .isEqualTo("test");
            assertThat(c2.name)
                .isEqualTo("C2");
            assertThat(c3.name)
                .isEqualTo("test");
            assertThat(c4.name)
                .isEqualTo("test2");
        }
    });
});
