import {IDocumentStore} from "../../src";
import {disposeTestDocumentStore, testContext,} from "../Utils/TestUtil";
import {assertThat} from "../Utils/AssertExtensions";

describe("RDBC-653", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
    {
        await disposeTestDocumentStore(store);
    });

    async function checkMetadataUpdates(metadataKeyToSet:string, metadataValueToCheck) {
        let customer = {
            id: "customer/1",
            name: "foo",
            balance: 10
        };

        let session = await store.openSession();
        try {
            await session.store(customer);
            const metadata = session.advanced.getMetadataFor(customer);
            metadata[metadataKeyToSet] = metadataValueToCheck;
            await session.saveChanges();
        }
        finally {
            session.dispose();
        }

        try
        {
            session = await store.openSession();
            const numberOfRequests = session.advanced.numberOfRequests;
            customer = await session.load(customer.id);
            assertThat(session.advanced.numberOfRequests).isEqualTo(numberOfRequests + 1);
            assertThat(session.advanced.getMetadataFor(customer)[metadataKeyToSet]).isEqualTo(metadataValueToCheck);

            customer.balance = 10;
            await session.saveChanges();
            assertThat(session.advanced.numberOfRequests).isEqualTo(numberOfRequests + 1);
        }
        finally {
            session.dispose();
        }
    }

    it("raw object metadata wont be updated spuriously", async () => {
        let customer = {
            id: "customer/1",
            name: "foo",
            balance: 10
        };

        let session = await store.openSession();
        try {
            await session.store(customer);
            await session.saveChanges();
        }
        finally {
            session.dispose();
        }

        try {
            session = await store.openSession();
            customer = await session.load(customer.id);
            assertThat(session.advanced.numberOfRequests).isEqualTo(1);
            customer.balance = 10;
            await session.saveChanges();
            assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        }
        finally {
            session.dispose();
        }

    })

    it("custom metadata wont be updated spuriously on falsy value 1", async () => {
        await checkMetadataUpdates("myMetadata", 0);
    })

    it("custom metadata wont be updated spuriously on falsy value 2", async () => {
        await checkMetadataUpdates("myMetadata", false);
    })

    it("custom metadata wont be updated spuriously on falsy value 3", async () => {
        await checkMetadataUpdates("myMetadata", "");
    })

    it("custom metadata wont be updated spuriously", async () => {
        await checkMetadataUpdates("myMetadata", 47546921371);
    })
})