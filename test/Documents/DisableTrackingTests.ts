import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
    DocumentStore,
} from "../../src";
import {Employee} from "../Assets/Orders";
import {assertThat, assertThrows} from "../Utils/AssertExtensions";

describe("Disable tracking basic tests", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    describe("Disable tracking from session", () => {

        it("Ignore changes for specific entity", async () => {
            {
                const session = store.openSession();
                
                const e1 = new Employee();
                e1.firstName = "Bob";
                e1.lastName = "Last1";
                
                const e2 = new Employee();
                e2.firstName = "Alice";
                e2.lastName = "Last2";
                
                await session.store(e1, "employees/1-A");
                await session.store(e2, "employees/2-A");
                
                await session.saveChanges(); // both e1 & e2 persisted
                
                session.advanced.ignoreChangesFor(e1);
                
                e1.lastName = "Last3";
                e2.lastName = "Last4";
                
                await session.saveChanges(); // only e2 persisted
            }
            {
                const session = store.openSession();
                const e1 = await session.load<Employee>("employees/1-A");
                const e2 = await session.load<Employee>("employees/2-A");
                
                assert.strictEqual(e1.firstName, "Bob");
                assert.strictEqual(e1.lastName, "Last1");
                
                assert.strictEqual(e2.firstName, "Alice");
                assert.strictEqual(e2.lastName, "Last4");
            }
        });

        it("Disable tracking all entities", async () => {
            {
                // Note: More variations for this test case are in file: RavenDB-11217
                {
                    const session = store.openSession();

                    const e1 = new Employee();
                    e1.firstName = "Bob";
                    e1.lastName = "Last1";

                    const e2 = new Employee();
                    e2.firstName = "Alice";
                    e2.lastName = "Last2";

                    await session.store(e1, "employees/1-A");
                    await session.store(e2, "employees/2-A");

                    await session.saveChanges();
                }
                {
                    const session = store.openSession({ noTracking: true });
                    
                    const e1 = await session.load<Employee>("employees/1-A");
                    
                    const e2 = await session.load<Employee>("employees/2-A");
                    
                    assert.strictEqual(session.advanced.isLoaded("employees/1-A"), false);
                    assert.notStrictEqual(e1, e2);
                    
                    e1.lastName = "Last3";
                    e2.lastName = "Last4";

                    await assertThrows(() => session.store(e1), err => {
                        assertThat(err.name)
                            .isEqualTo("InvalidOperationException");
                    });
                }
            }
        });
    });

    describe("Disable tracking from conventions", () => {
        let customStore: DocumentStore;

        beforeEach(async function () {
            customStore = new DocumentStore(store.urls, store.database);
        });

        afterEach(async () =>
            await disposeTestDocumentStore(customStore));
        
        it("Customize disable tracking from conventions", async () => {
            {
                customStore.conventions.shouldIgnoreEntityChanges =
                    (sessionOperations, entity, documentId) => {
                        return entity instanceof Employee && entity.firstName === "Bob";
                    };
                customStore.initialize();

                {
                    const session = customStore.openSession();

                    const e1 = new Employee();
                    e1.firstName = "Bob";
                    e1.lastName = "Last1"

                    const e2 = new Employee();
                    e2.firstName = "Alice";
                    e2.lastName = "Last2";

                    await session.store(e1, "employees/1-A");
                    await session.store(e2, "employees/2-A");

                    await session.saveChanges(); // only e2 is persisted

                    e1.firstName = "Mark";
                    e1.lastName = "Last3";

                    e2.firstName = "Bob";
                    e2.lastName = "Last4";

                    await session.saveChanges(); // only e1 is persisted
                }
                {
                    const session = customStore.openSession();

                    const test1 = await session.load<Employee>("employees/1-A");
                    const test2 = await session.load<Employee>("employees/2-A");

                    assert.strictEqual(test1.firstName, "Mark");
                    assert.strictEqual(test1.lastName, "Last3");

                    assert.strictEqual(test2.firstName, "Alice");
                    assert.strictEqual(test2.lastName, "Last2");
                }
            }
        });
    });
});
