import {
    DocumentInfo,
    IDocumentSession,
    IDocumentStore,
    InMemoryDocumentSessionOperations
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions.js";

class Address {
    public id?: string;
    public city?: string;
    public street?: string;
}

class Employee {
    public firstName: string;
    public address?: Address;
}

(RavenTestContext.isRavenDbServerVersion("7.2") ? describe : describe.skip)("RavenDB_25154", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    function openWritesAndReadsSession(): IDocumentSession {
        return store.openSession({ optimisticConcurrencyMode: "WritesAndReads" });
    }

    async function modifyEgorInSession(session: IDocumentSession): Promise<void> {
        const egor = await session.load("employees/2-A", Employee);
        egor.address = { street: "Mul HaHof Village" };
    }

    async function storeEmployees(...employees: [string, Employee][]): Promise<void> {
        const session = store.openSession();
        for (const [id, employee] of employees) {
            await session.store(Object.assign(new Employee(), employee), id);
        }
        await session.saveChanges();
    }

    async function assertConcurrencyException(session: IDocumentSession, expectedMessage: string): Promise<void> {
        await assertThrows(() => session.saveChanges(), err => {
            assertThat(err.name).isEqualTo("ConcurrencyException");
            assertThat(err.message).contains(expectedMessage);
        });
    }

    async function assertEgorStreet(expectedStreet: string): Promise<void> {
        const session = store.openSession();
        const egor = await session.load("employees/2-A", Employee);
        assertThat(egor.firstName).isEqualTo("Egor");
        assertThat(egor.address.street).isEqualTo(expectedStreet);
    }

    async function modifyAddressInBackground(addressId: string, city: string): Promise<void> {
        const session = store.openSession();
        const address = await session.load(addressId, Address);
        address.city = city;
        await session.saveChanges();
    }

    const egor: [string, Employee] = ["employees/2-A", { firstName: "Egor", address: { street: "Ahad Ha'am" } }];

    it("shouldThrowConcurrencyException_whenTrackedEntityIsNullButThenWasAddedInBackgroundSession", async () => {
        await storeEmployees(egor);

        const session = openWritesAndReadsSession();
        const jerry = await session.load("employees/1-A", Employee);
        assertThat(jerry).isNull();

        await modifyEgorInSession(session);

        await storeEmployees(["employees/1-A", { firstName: "Jerry", address: { city: "Hadera" } }]);

        await assertConcurrencyException(session, "Document 'employees/1-A' has been modified");

        await assertEgorStreet("Ahad Ha'am");
    });

    it("shouldThrowConcurrencyException_whenTrackedEntityDeletedByIdButThenWasEditedInBackgroundSession", async () => {
        await storeEmployees(["employees/1-A", { firstName: "Jerry" }], egor);

        const session = openWritesAndReadsSession();
        await session.load("employees/1-A", Employee);
        session.delete("employees/1-A");
        await modifyEgorInSession(session);

        {
            const s = store.openSession();
            const j = await s.load("employees/1-A", Employee);
            j.address = { city: "Hadera" };
            await s.saveChanges();
        }

        await assertConcurrencyException(session, "Document 'employees/1-A' has been modified");

        await assertEgorStreet("Ahad Ha'am");
    });

    it("shouldThrowConcurrencyException_whenNonExistsEntityIncludedBySessionButThenWasAddedInBackgroundSession", async () => {
        const addressId = "addresses/1-A";
        await storeEmployees(
            ["employees/1-A", { firstName: "Jerry", address: { id: addressId, city: "Harish", street: "Erets Rd" } }],
            egor);

        const session = openWritesAndReadsSession();
        const jerry = await session.include("address.id").load("employees/1-A", Employee);
        assertThat(await session.load(jerry.address.id, Address)).isNull();

        await modifyEgorInSession(session);

        {
            const s = store.openSession();
            await s.store(Object.assign(new Address(), { city: "Harish", street: "Erets Rd" }), addressId);
            await s.saveChanges();
        }

        await assertConcurrencyException(session, "Document 'addresses/1-A' has been modified");

        await assertEgorStreet("Ahad Ha'am");
    });

    it("shouldThrowConcurrencyException_whenNonExistsEntityIncludedBySessionButThenWasEditedInBackgroundSession", async () => {
        const addressId = await storeJerryWithStoredAddress();

        const session = openWritesAndReadsSession();
        const jerry = await session.include("address.id").load("employees/1-A", Employee);

        const numberOfRequests = session.advanced.numberOfRequests;
        const address = await session.load(jerry.address.id, Address);
        assertThat(address).isNotNull();
        assertThat(session.advanced.numberOfRequests).isEqualTo(numberOfRequests);

        await modifyEgorInSession(session);

        await modifyAddressInBackground(addressId, "Hadera");

        await assertConcurrencyException(session, "Document 'addresses/1-A' has been modified");

        await assertEgorStreet("Ahad Ha'am");
    });

    it("shouldThrowConcurrencyException_whenEntityIncludedByIdInSessionButThenWasEditedInBackgroundSession", async () => {
        const addressId = await storeJerryWithStoredAddress();

        const session = openWritesAndReadsSession();
        await session.include("address.id").load("employees/1-A", Employee);
        await modifyEgorInSession(session);

        const included = (session as unknown as InMemoryDocumentSessionOperations).includedDocumentsById.get(addressId);
        assertThat(included).isNotNull();

        await modifyAddressInBackground(addressId, "Hadera");

        await assertConcurrencyException(session, "Document 'addresses/1-A' has been modified");

        await assertEgorStreet("Ahad Ha'am");
    });

    it("shouldNotThrowConcurrencyException_whenNonExistsEntityIncludedBySessionButThenWasNotAddedInBackgroundSession", async () => {
        const addressId = "addresses/1-A";
        await storeEmployees(
            ["employees/1-A", { firstName: "Jerry", address: { id: addressId, city: "Harish", street: "Erets Rd" } }],
            egor);

        const session = openWritesAndReadsSession();
        const jerry = await session.include("address.id").load("employees/1-A", Employee);
        assertThat(await session.load(jerry.address.id, Address)).isNull();

        await modifyEgorInSession(session);

        await session.saveChanges();

        await assertEgorStreet("Mul HaHof Village");

        const check = store.openSession();
        assertThat(await check.load(addressId, Address)).isNull();
    });

    it("shouldNotThrowConcurrencyException_whenIncludedDocumentEvictedFromSession", async () => {
        const addressId = await storeJerryWithStoredAddress();

        const session = openWritesAndReadsSession();
        const jerry = await session.include("address.id").load("employees/1-A", Employee);

        const numberOfRequests = session.advanced.numberOfRequests;
        const address = await session.load(jerry.address.id, Address);
        assertThat(address).isNotNull();
        assertThat(session.advanced.numberOfRequests).isEqualTo(numberOfRequests);

        session.advanced.evict(address);

        await modifyEgorInSession(session);

        await modifyAddressInBackground(addressId, "Hadera");

        await session.saveChanges();

        await assertEgorStreet("Mul HaHof Village");

        const check = store.openSession();
        assertThat((await check.load(addressId, Address)).city).isEqualTo("Hadera");
    });

    it("shouldNotThrowConcurrencyException_whenEntityModifiedInBackgroundSessionButThenRefreshed", async () => {
        await storeEmployees(["employees/1-A", { firstName: "Jerry" }], egor);

        const session = openWritesAndReadsSession();
        const jerry = await session.load("employees/1-A", Employee);
        await session.load("employees/2-A", Employee);

        {
            const s = store.openSession();
            const j = await s.load("employees/1-A", Employee);
            j.address = { city: "Tel Aviv" };
            await s.saveChanges();
        }

        await session.advanced.refresh(jerry);
        assertThat(jerry.address.city).isEqualTo("Tel Aviv");

        await modifyEgorInSession(session);

        await session.saveChanges();

        await assertEgorStreet("Mul HaHof Village");
    });

    it("shouldNotThrowConcurrencyException_whenSavingAgainAfterPatchingLoadedEntity", async () => {
        await storeEmployees(["employees/1-A", { firstName: "Jerry" }], egor);

        const session = openWritesAndReadsSession();
        const jerry = await session.load("employees/1-A", Employee);
        const loadedEgor = await session.load("employees/2-A", Employee);
        session.advanced.patch(loadedEgor, "address.street", "Mul HaHof Village");
        await session.saveChanges();

        jerry.address = { city: "Tel Aviv" };
        await session.saveChanges();

        await assertEgorStreet("Mul HaHof Village");
    });

    it("shouldNotThrowConcurrencyException_whenSavingAgainAfterDeletingById", async () => {
        await storeEmployees(["employees/1-A", { firstName: "Jerry" }], egor);

        const session = openWritesAndReadsSession();
        await session.load("employees/1-A", Employee);
        session.delete("employees/1-A");
        await session.saveChanges();

        await modifyEgorInSession(session);
        await session.saveChanges();

        await assertEgorStreet("Mul HaHof Village");
    });

    it("shouldRemoveFromIncluded_whenRegisteringExternalEntityThatWasIncluded", async () => {
        const addressId = await storeJerryWithStoredAddress();

        const session = openWritesAndReadsSession();
        await session.include("address.id").load("employees/1-A", Employee);

        const inMemorySession = session as unknown as InMemoryDocumentSessionOperations;
        assertThat(inMemorySession.includedDocumentsById.has(addressId)).isTrue();

        let externalAddress: Address;
        let addressChangeVector: string;
        {
            const externalSession = store.openSession();
            externalAddress = await externalSession.load(addressId, Address);
            addressChangeVector = externalSession.advanced.getChangeVectorFor(externalAddress);
        }

        const documentInfo = new DocumentInfo();
        documentInfo.id = addressId;
        documentInfo.entity = externalAddress;
        documentInfo.changeVector = addressChangeVector;
        documentInfo.document = null;
        documentInfo.metadata = {
            "@collection": "Addresses",
            "@change-vector": addressChangeVector
        };

        inMemorySession.registerExternalLoadedIntoTheSession(documentInfo);

        assertThat(inMemorySession.includedDocumentsById.has(addressId)).isFalse();

        await modifyAddressInBackground(addressId, "Hadera");

        await assertConcurrencyException(session, `but Put was called with change vector ${addressChangeVector}`);
    });

    async function storeJerryWithStoredAddress(): Promise<string> {
        const session = store.openSession();
        const address = Object.assign(new Address(), { city: "Harish", street: "Erets Rd" });
        await session.store(address);
        const addressId = session.advanced.getDocumentId(address);
        assertThat(addressId).isEqualTo("addresses/1-A");

        await session.store(Object.assign(new Employee(), { firstName: "Jerry", address }), "employees/1-A");
        await session.store(Object.assign(new Employee(), egor[1]), egor[0]);
        await session.saveChanges();

        return addressId;
    }
});
