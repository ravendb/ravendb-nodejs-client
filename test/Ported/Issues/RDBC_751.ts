import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Employee} from "../../Assets/Orders";
import {assertThat, assertThrows} from "../../Utils/AssertExtensions";
import DocumentStore from "../../../src";
import {CreateSampleDataOperation} from "../../Utils/CreateSampleDataOperation";

describe("RDBC_751", function () {
    let regularStore: IDocumentStore;

    beforeEach(async function () {
        regularStore = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(regularStore));

    function getStoreWithCustomConventions(setupStore: (store: DocumentStore) => void) {
        const customStore = new DocumentStore(regularStore.urls, regularStore.database);
        setupStore(customStore);
        customStore.initialize();
        return customStore;
    }

    it("canSearchWithProximityZero", async () => {
        const store = getStoreWithCustomConventions((s) => {
            s.conventions.findCollectionNameForObjectLiteral = (o) => o["collection"];
            s.conventions.entityFieldNameConvention = "camel";
            s.conventions.remoteEntityFieldNameConvention = "pascal";
            s.conventions.identityProperty = "id";
            s.conventions.registerEntityIdPropertyName(Object, "id");
        });

        await store.maintenance.send(new CreateSampleDataOperation());
        
        {
            const session = store.openSession();
            
            const employee9A= await session.load<Employee>("employees/9-A");
            employee9A.notes = ["Anne has a BA degree in English from St. Lawrence College. She has fluent French."];
            await session.store(employee9A);
            await session.saveChanges();
        }

        // Test for terms that are maximum 5 terms apart
        {
            const session = store.openSession();

            const employeesWithProximity5 = await session
                .query(Employee)
                .search("Notes", "fluent french")
                .proximity(5)
                .waitForNonStaleResults()
                .all();

            assertThat(employeesWithProximity5).hasSize(4);
        }

        // Test for terms that are 0 terms apart
        // Results will contain a single word that was not tokenized to a term in between
        {
            const session = store.openSession();

            const employeesWithProximity0 = await session
                .query(Employee)
                .search("Notes", "fluent french")
                .proximity(0)
                .waitForNonStaleResults()
                .all();

            assertThat(employeesWithProximity0).hasSize(3);
            
            assertThat(employeesWithProximity0[0].id).isEqualTo("employees/2-A");
            assertThat(employeesWithProximity0[1].id).isEqualTo("employees/5-A");
            assertThat(employeesWithProximity0[2].id).isEqualTo("employees/9-A");
            
            assertThat(employeesWithProximity0[0].notes[0]).contains("fluent in French");
            assertThat(employeesWithProximity0[1].notes[0]).contains("fluent in French");
            assertThat(employeesWithProximity0[2].notes[0]).contains("fluent French");
        }

        // Test that are 0 terms apart
        // Consecutive results only
        {
            const session = store.openSession();

            const employee2A= await session.load<Employee>("employees/2-A");
            employee2A.notes = ["Andrew knows fluent Belgian French."];
            await session.store(employee2A);

            const employee5A= await session.load<Employee>("employees/5-A");
            employee5A.notes = ["Steven knows fluent Canadian French."];
            await session.store(employee5A);
            
            await session.saveChanges();

            const employeesWithProximity0 = await session
                .query(Employee)
                .search("Notes", "fluent french")
                .proximity(0)
                .waitForNonStaleResults()
                .all()
            
            assertThat(employeesWithProximity0).hasSize(1);
            assertThat(employeesWithProximity0[0].id).isEqualTo("employees/9-A");
        }
    });

    it("cannotSearchWithNegativeProximity", async () => {
        const session = regularStore.openSession();
        
        await assertThrows(
            async () => await session
                .query(Employee)
                .search("Notes", "fluent french")
                .proximity(-1)
                .waitForNonStaleResults()
                .all(),
            err => {
                assertThat(err.name).isEqualTo("InvalidArgumentException");
                assertThat(err.message).isEqualTo("Proximity distance must be a number greater than or equal to 0");
            });
    });

    it("cannotUseProximityAfterWhereClause", async () => {
        const session = regularStore.openSession();

        await assertThrows(
            async () => await session
                .query(Employee)
                .whereEquals("Notes", "fluent french")
                .proximity(1)
                .waitForNonStaleResults()
                .all(),
            err => {
                assertThat(err.name).isEqualTo("InvalidOperationException");
                assertThat(err.message).isEqualTo("Proximity can only be used right after search clause");
            });
    });

    it("CannotUseProximityWithSingleTerm", async () => {
        const session = regularStore.openSession();

        await assertThrows(
            async () => await session
                .query(Employee)
                .search("Notes", "fluent")
                .proximity(1)
                .waitForNonStaleResults()
                .all(),
            err => {
                assertThat(err.name).isEqualTo("InvalidQueryException");
                assertThat(err.message).contains("Proximity search works only on multiple search terms");
            });
    });
    
    it("CannotUseProximityWithWildcards", async () => {
        const session = regularStore.openSession();

        await assertThrows(
            async () => await session
                .query(Employee)
                .search("Notes", "*luent frenc*")
                .proximity(1)
                .waitForNonStaleResults()
                .all(),
            err => {
                assertThat(err.name).isEqualTo("InvalidQueryException");
                assertThat(err.message).contains("Proximity search works only on simple string terms, not wildcard");
            });
    });
});
