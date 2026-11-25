import {
    DocumentInfo,
    IDocumentSession,
    IDocumentStore,
    InMemoryDocumentSessionOperations,
    OptimisticConcurrencyMode
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

    type ConcurrencyError = Error & { id?: string; expectedChangeVector?: string; actualChangeVector?: string };

    const jerry: [string, Employee] = ["employees/1-A", { firstName: "Jerry" }];

    async function saveChangesConcurrencyError(session: IDocumentSession): Promise<ConcurrencyError> {
        return assertThrows(() => session.saveChanges(), err => assertThat(err.name).isEqualTo("ConcurrencyException"));
    }

    async function modifyInBackground(id: string, modify: (employee: Employee) => void): Promise<string> {
        const session = store.openSession();
        const employee = await session.load(id, Employee);
        modify(employee);
        await session.saveChanges();
        return session.advanced.getChangeVectorFor(employee);
    }

    async function moveJerryToHaderaInBackground(): Promise<string> {
        const actual = await modifyInBackground("employees/1-A", j => j.address = { city: "Hadera" });
        assertThat(actual).isNotEmpty();
        return actual;
    }

    async function assertJerryCity(expectedCity: string): Promise<void> {
        const session = store.openSession();
        const j = await session.load("employees/1-A", Employee);
        assertThat(j.address.city).isEqualTo(expectedCity);
    }

    async function assertJerryDeleted(): Promise<void> {
        const session = store.openSession();
        assertThat(await session.load("employees/1-A", Employee)).isNull();
    }

    async function recreateStoreWithConventionsMode(mode: OptimisticConcurrencyMode): Promise<void> {
        await disposeTestDocumentStore(store);
        testContext.customizeStore = async s => {
            s.conventions.optimisticConcurrencyMode = mode;
        };
        try {
            store = await testContext.getDocumentStore();
        } finally {
            testContext.customizeStore = null;
        }
    }

    function externalDocumentInfo(id: string, entity: object, changeVector: string): DocumentInfo {
        const documentInfo = new DocumentInfo();
        documentInfo.id = id;
        documentInfo.entity = entity;
        documentInfo.changeVector = changeVector;
        documentInfo.document = null;
        documentInfo.metadata = {
            "@collection": "Employees",
            "@change-vector": changeVector
        };
        return documentInfo;
    }

    async function loadExternally(id: string): Promise<[Employee, string]> {
        const externalSession = store.openSession();
        const employee = await externalSession.load(id, Employee);
        return [employee, externalSession.advanced.getChangeVectorFor(employee)];
    }

    function trackedChangeVectors(session: IDocumentSession): Map<string, string> {
        return new Map((session as unknown as InMemoryDocumentSessionOperations).trackedEntities);
    }

    const newEgor = (): Employee => Object.assign(new Employee(), { firstName: "Egor", address: { street: "Mul HaHof Village" } });
    const imageData = () => Buffer.from("image data");

    const sessionActions: ((session: IDocumentSession) => Promise<void>)[] = [
        async function modifyEgorInSessionAction(session) {
            await modifyEgorInSession(session);
        },
        async function modifyEgorInPatchAfterLoad(session) {
            const e = await session.load("employees/2-A", Employee);
            session.advanced.patch(e, "address.street", "Mul HaHof Village");
        },
        async function modifyEgorInPatchNoLoad(session) {
            session.advanced.patch("employees/2-A", "address.street", "Mul HaHof Village");
        },
        async function modifyEgorWithStoreOverwriteAfterLoadAndEvict(session) {
            const e = await session.load("employees/2-A", Employee);
            session.advanced.evict(e);
            await session.store(newEgor(), "employees/2-A");
        },
        async function modifyEgorWithStoreOverwriteWithoutLoad(session) {
            await session.store(newEgor(), "employees/2-A");
        },
        async function modifyEgorWithLoadAndDeleteById(session) {
            await session.load("employees/2-A", Employee);
            await session.delete("employees/2-A");
        },
        async function modifyEgorWithLoadAndDeleteByEntity(session) {
            const e = await session.load("employees/2-A", Employee);
            await session.delete(e);
        },
        async function modifyEgorWithMultiplePatches(session) {
            session.advanced.patch("employees/2-A", "address.street", "Mul HaHof Village");
            session.advanced.patch("employees/2-A", "firstName", "Egor");
        },
        async function modifyEgorByReplacingAddress(session) {
            const e = await session.load("employees/2-A", Employee);
            session.advanced.patch(e, "address", { street: "Mul HaHof Village", city: "Hadera" });
        },
        async function modifyEgorWithAttachmentWithLoad(session) {
            const e = await session.load("employees/2-A", Employee);
            session.advanced.attachments.store(e, "profile-picture", imageData());
        },
        async function modifyEgorWithAttachmentNoLoad(session) {
            session.advanced.attachments.store("employees/2-A", "profile-picture", imageData());
        },
        async function modifyEgorWithTimeSeriesNoLoad(session) {
            session.timeSeriesFor("employees/2-A", "profile-picture-likes").append(new Date(), [322], "super-like");
        },
        async function modifyEgorWithTimeSeriesWithLoad(session) {
            const e = await session.load("employees/2-A", Employee);
            session.timeSeriesFor(e, "profile-picture-likes").append(new Date(), [322], "super-like");
        },
        async function modifyEgorWithCounterWithLoad(session) {
            const e = await session.load("employees/2-A", Employee);
            session.countersFor(e).increment("profile-picture-likes");
        },
        async function modifyEgorWithCounterNoLoad(session) {
            session.countersFor("employees/2-A").increment("profile-picture-likes");
        },
        async function modifyEgorWithRevisionNoLoad(session) {
            session.advanced.revisions.forceRevisionCreationFor("employees/2-A");
        },
        async function modifyEgorWithRevisionWithLoad(session) {
            const e = await session.load("employees/2-A", Employee);
            session.advanced.revisions.forceRevisionCreationFor(e);
        }
    ];

    for (const sessionAction of sessionActions) {
        it(`shouldThrowConcurrencyException_whenTrackedEntityWasChangedInBackgroundSession (${sessionAction.name})`, async () => {
            await storeEmployees(jerry, egor);

            const session = openWritesAndReadsSession();
            const loadedJerry = await session.load("employees/1-A", Employee);

            await sessionAction(session);

            const expected = session.advanced.getChangeVectorFor(loadedJerry);
            assertThat(expected).isNotEmpty();

            const actual = await moveJerryToHaderaInBackground();

            const error = await saveChangesConcurrencyError(session);
            assertThat(error.message).contains("Document 'employees/1-A' has been modified");
            assertThat(error.id).isEqualTo("employees/1-A");
            assertThat(error.actualChangeVector).isEqualTo(actual);
            assertThat(error.expectedChangeVector).isEqualTo(expected);

            await assertEgorStreet("Ahad Ha'am");
            await assertJerryCity("Hadera");
        });
    }

    it("shouldThrowConcurrencyException_whenNoCommandsInSessionButTrackedEntityWasChangedInBackgroundSession", async () => {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        await modifyEgorInSession(session);

        const expected = session.advanced.getChangeVectorFor(loadedJerry);
        assertThat(expected).isNotEmpty();

        await session.saveChanges();

        const actual = await moveJerryToHaderaInBackground();

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message).contains("Document 'employees/1-A' has been modified");
        assertThat(error.id).isEqualTo("employees/1-A");
        assertThat(error.actualChangeVector).isEqualTo(actual);
        assertThat(error.expectedChangeVector).isEqualTo(expected);

        await assertEgorStreet("Mul HaHof Village");
        await assertJerryCity("Hadera");
    });

    it("shouldThrowConcurrencyException_whenTrackedEntityDeletedByEntityButThenWasEditedInBackgroundSession", async () => {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        await session.delete(loadedJerry);
        await modifyEgorInSession(session);

        const expected = session.advanced.getChangeVectorFor(loadedJerry);
        assertThat(expected).isNotEmpty();

        const actual = await moveJerryToHaderaInBackground();

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message)
            .contains(`Document employees/1-A has change vector ${actual}, but Delete was called with change vector '${expected}'`);
        assertThat(error.id).isEqualTo("employees/1-A");
        assertThat(error.actualChangeVector).isEqualTo(actual);
        assertThat(error.expectedChangeVector).isEqualTo(expected);

        await assertEgorStreet("Ahad Ha'am");
        await assertJerryCity("Hadera");
    });

    it("shouldNotThrowConcurrencyException_whenTrackedEntityDeletedByIdWithoutChangeVectorButThenWasNotEditedInBackgroundSession", async () => {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        await session.load("employees/1-A", Employee);
        await session.delete("employees/1-A");
        await modifyEgorInSession(session);

        await session.saveChanges();

        await assertEgorStreet("Mul HaHof Village");
        await assertJerryDeleted();
    });

    it("shouldNotThrowConcurrencyException_whenTrackedEntityDeletedByIdWithChangeVectorButThenWasNotEditedInBackgroundSession2", async () => {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        const actual = session.advanced.getChangeVectorFor(loadedJerry);
        await session.delete("employees/1-A", "test");
        await modifyEgorInSession(session);

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message).contains(
            `Document ${error.id} has change vector ${error.actualChangeVector}, but Delete was called with change vector '${error.expectedChangeVector}'. Optimistic concurrency violation, transaction will be aborted.`);
        assertThat(error.id).isEqualTo("employees/1-A");
        assertThat(error.actualChangeVector).isEqualTo(actual);
        assertThat(error.expectedChangeVector).isEqualTo("test");

        await assertEgorStreet("Ahad Ha'am");
        const check = store.openSession();
        assertThat((await check.load("employees/1-A", Employee)).firstName).isEqualTo("Jerry");
    });

    for (const sessionAction of sessionActions) {
        it(`shouldThrowConcurrencyException_whenTrackedEntityIncludedBySessionButThenWasEditedInBackgroundSession (${sessionAction.name})`, async () => {
            const addressId = await storeJerryWithStoredAddress();

            const session = openWritesAndReadsSession();
            const loadedJerry = await session.include("address.id").load("employees/1-A", Employee);

            const numberOfRequests = session.advanced.numberOfRequests;
            const address = await session.load(loadedJerry.address.id, Address);
            assertThat(address).isNotNull();
            assertThat(session.advanced.numberOfRequests).isEqualTo(numberOfRequests);

            await sessionAction(session);

            const expected = session.advanced.getChangeVectorFor(address);
            assertThat(expected).isNotEmpty();

            let actual: string;
            {
                const s = store.openSession();
                const a = await s.load(addressId, Address);
                a.city = "Hadera";
                await s.saveChanges();
                actual = s.advanced.getChangeVectorFor(a);
            }
            assertThat(actual).isNotEmpty();

            const error = await saveChangesConcurrencyError(session);
            assertThat(error.message).contains(`Document '${addressId}' has been modified`);
            assertThat(error.id).isEqualTo(addressId);
            assertThat(error.actualChangeVector).isEqualTo(actual);
            assertThat(error.expectedChangeVector).isEqualTo(expected);

            await assertEgorStreet("Ahad Ha'am");
            const check = store.openSession();
            assertThat((await check.load(addressId, Address)).city).isEqualTo("Hadera");
        });
    }

    it("shouldThrowConcurrencyException_whenTrackedEntityEvictedFromTheSessionAndThenAddedBack", async () => {
        await storeJerryWithStoredAddress();

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.include("address.id").load("employees/1-A", Employee);
        assertThat(await session.load(loadedJerry.address.id, Address)).isNotNull();

        const loadedEgor = await session.load("employees/2-A", Employee);
        session.advanced.evict(loadedEgor);
        await session.store(newEgor(), "employees/2-A");

        await saveChangesConcurrencyError(session);
    });

    it("shouldThrowConcurrencyException_whenTrackedEntityReStored", async () => {
        await storeEmployees(egor);

        const session = openWritesAndReadsSession();
        await session.store(newEgor(), "employees/2-A");

        await saveChangesConcurrencyError(session);
    });

    it("shouldNotThrowConcurrencyException_whenTrackedEntityEvictedFromSession", async () => {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        const expected = session.advanced.getChangeVectorFor(loadedJerry);

        await modifyEgorInSession(session);

        session.advanced.evict(loadedJerry);

        const actual = await moveJerryToHaderaInBackground();
        assertThat(actual).isNotEqualTo(expected);

        await session.saveChanges();

        await assertEgorStreet("Mul HaHof Village");
        await assertJerryCity("Hadera");
    });

    it("shouldThrowConcurrencyException_whenRefreshedEntityModifiedInBackgroundSession", async () => {
        await storeEmployees(["employees/1-A", { firstName: "Jerry", address: { city: "Hadera" } }], egor);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        await session.load("employees/2-A", Employee);

        await modifyInBackground("employees/1-A", j => j.address = { city: "Tel Aviv" });

        await session.advanced.refresh(loadedJerry);
        assertThat(loadedJerry.address.city).isEqualTo("Tel Aviv");

        const expectedJerryCv = session.advanced.getChangeVectorFor(loadedJerry);

        await modifyEgorInSession(session);

        const actualJerryCv = await modifyInBackground("employees/1-A", j => j.firstName = "Jeremy");
        assertThat(actualJerryCv).isNotEmpty();
        assertThat(actualJerryCv).isNotEqualTo(expectedJerryCv);

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message).contains("Document 'employees/1-A' has been modified");
        assertThat(error.id).isEqualTo("employees/1-A");
        assertThat(error.actualChangeVector).isEqualTo(actualJerryCv);
        assertThat(error.expectedChangeVector).isEqualTo(expectedJerryCv);

        await assertEgorStreet("Ahad Ha'am");
        const check = store.openSession();
        const j = await check.load("employees/1-A", Employee);
        assertThat(j.firstName).isEqualTo("Jeremy");
        assertThat(j.address.city).isEqualTo("Tel Aviv");
    });

    it("shouldUpdateChangeVector_whenRefreshingMultipleEntities", async () => {
        await storeEmployees(jerry, ["employees/2-A", { firstName: "Egor" }], ["employees/3-A", { firstName: "Alice" }]);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        const loadedEgor = await session.load("employees/2-A", Employee);
        const alice = await session.load("employees/3-A", Employee);

        const originalJerryCv = session.advanced.getChangeVectorFor(loadedJerry);
        const originalEgorCv = session.advanced.getChangeVectorFor(loadedEgor);
        const originalAliceCv = session.advanced.getChangeVectorFor(alice);

        {
            const s = store.openSession();
            (await s.load("employees/1-A", Employee)).firstName = "Jeremy";
            (await s.load("employees/2-A", Employee)).firstName = "Greg";
            await s.saveChanges();
        }

        await session.advanced.refresh([loadedJerry, loadedEgor, alice]);

        assertThat(session.advanced.getChangeVectorFor(loadedJerry)).isNotEqualTo(originalJerryCv);
        assertThat(session.advanced.getChangeVectorFor(loadedEgor)).isNotEqualTo(originalEgorCv);
        assertThat(session.advanced.getChangeVectorFor(alice)).isEqualTo(originalAliceCv);

        assertThat(loadedJerry.firstName).isEqualTo("Jeremy");
        assertThat(loadedEgor.firstName).isEqualTo("Greg");
        assertThat(alice.firstName).isEqualTo("Alice");

        await session.saveChanges();
    });

    it("shouldHandleEvictAndReload_withTrackingEnabled", async () => {
        await storeEmployees(["employees/1-A", { firstName: "Jerry", address: { city: "Hadera" } }]);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        const originalCv = session.advanced.getChangeVectorFor(loadedJerry);

        await modifyInBackground("employees/1-A", j => j.address.city = "Tel Aviv");

        session.advanced.evict(loadedJerry);

        const jerryReloaded = await session.load("employees/1-A", Employee);
        const newCv = session.advanced.getChangeVectorFor(jerryReloaded);

        assertThat(jerryReloaded).isNotSameAs(loadedJerry);
        assertThat(newCv).isNotEqualTo(originalCv);
        assertThat(jerryReloaded.address.city).isEqualTo("Tel Aviv");

        await modifyInBackground("employees/1-A", j => j.firstName = "Jeremy");

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message).contains("Document 'employees/1-A' has been modified");
        assertThat(error.id).isEqualTo("employees/1-A");
    });

    async function assertEvictedJerryNotChecked(evictBeforeBackgroundChange: boolean): Promise<void> {
        await storeEmployees(["employees/1-A", { firstName: "Jerry", address: { city: "Hadera" } }], egor);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        await modifyEgorInSession(session);

        if (evictBeforeBackgroundChange) {
            session.advanced.evict(loadedJerry);
        }

        await modifyInBackground("employees/1-A", j => j.address.city = "Tel Aviv");

        if (!evictBeforeBackgroundChange) {
            session.advanced.evict(loadedJerry);
        }

        await session.saveChanges();

        await assertEgorStreet("Mul HaHof Village");
        const check = store.openSession();
        const j = await check.load("employees/1-A", Employee);
        assertThat(j.firstName).isEqualTo("Jerry");
        assertThat(j.address.city).isEqualTo("Tel Aviv");
    }

    it("shouldHandleEvictAndReload_withTrackingEnabled2", async () => {
        await assertEvictedJerryNotChecked(false);
    });

    it("shouldHandleEvictAndReload_withTrackingEnabled3", async () => {
        await assertEvictedJerryNotChecked(true);
    });

    it("shouldNotTrack_afterEvictingAllLoadedEntities", async () => {
        await storeEmployees(jerry, ["employees/2-A", { firstName: "Egor" }]);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        const loadedEgor = await session.load("employees/2-A", Employee);

        assertThat(session.advanced.getNumberOfEntitiesInUnitOfWork()).isEqualTo(2);

        session.advanced.evict(loadedJerry);
        session.advanced.evict(loadedEgor);

        assertThat(session.advanced.getNumberOfEntitiesInUnitOfWork()).isEqualTo(0);

        {
            const s = store.openSession();
            (await s.load("employees/1-A", Employee)).firstName = "Jeremy";
            (await s.load("employees/2-A", Employee)).firstName = "Greg";
            await s.saveChanges();
        }

        await session.saveChanges();

        const check = store.openSession();
        assertThat((await check.load("employees/1-A", Employee)).firstName).isEqualTo("Jeremy");
        assertThat((await check.load("employees/2-A", Employee)).firstName).isEqualTo("Greg");
    });

    it("shouldRefreshAndMaintainTracking_whenEntityModifiedLocally", async () => {
        await storeEmployees(["employees/1-A", { firstName: "Jerry", address: { city: "Hadera" } }]);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);

        loadedJerry.address.street = "Local Street";

        await session.advanced.refresh(loadedJerry);

        assertThat(loadedJerry.address.street).isUndefined();
        assertThat(loadedJerry.address.city).isEqualTo("Hadera");

        assertThat(session.advanced.isLoaded("employees/1-A")).isTrue();

        loadedJerry.firstName = "Jeremy";
        await session.saveChanges();

        const check = store.openSession();
        assertThat((await check.load("employees/1-A", Employee)).firstName).isEqualTo("Jeremy");
    });

    it("shouldTrackExternalEntity_whenAddedViaTrackEntityMethod", async () => {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        await session.load("employees/1-A", Employee);

        const [externalEmployee, externalChangeVector] = await loadExternally("employees/2-A");

        const inMemorySession = session as unknown as InMemoryDocumentSessionOperations;
        inMemorySession.registerExternalLoadedIntoTheSession(
            externalDocumentInfo("employees/2-A", externalEmployee, externalChangeVector));

        assertThat(trackedChangeVectors(session).get("employees/2-A")).isEqualTo(externalChangeVector);

        const actualEgorCv = await modifyInBackground("employees/2-A", e => e.address = { street: "Mul HaHof Village" });

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message)
            .contains(`Document employees/2-A has change vector ${actualEgorCv}, but Put was called with change vector ${externalChangeVector}`);
        assertThat(error.id).isEqualTo("employees/2-A");
        assertThat(error.actualChangeVector).isEqualTo(actualEgorCv);
        assertThat(error.expectedChangeVector).isEqualTo(externalChangeVector);
    });

    it("shouldNotThrowConcurrencyException_whenExternallyTrackedEntityNotModified", async () => {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        await session.load("employees/1-A", Employee);

        const [externalEmployee, externalChangeVector] = await loadExternally("employees/2-A");

        const inMemorySession = session as unknown as InMemoryDocumentSessionOperations;
        const documentInfo = externalDocumentInfo("employees/2-A", externalEmployee, externalChangeVector);
        documentInfo.document = inMemorySession.entityToJson.convertEntityToJson(externalEmployee, documentInfo);
        inMemorySession.trackEntity(Employee, documentInfo);

        await moveJerryToHaderaInBackground();

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message).contains("Document 'employees/1-A' has been modified");
        assertThat(error.id).isEqualTo("employees/1-A");

        await assertJerryCity("Hadera");
        await assertEgorStreet("Ahad Ha'am");
    });

    it("shouldThrowException_whenRegisteringExternalEntityWithDifferentInstanceForSameId", async () => {
        await storeEmployees(jerry);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        const jerryChangeVector = session.advanced.getChangeVectorFor(loadedJerry);

        const inMemorySession = session as unknown as InMemoryDocumentSessionOperations;
        const documentInfo = externalDocumentInfo(
            "employees/1-A", Object.assign(new Employee(), { firstName: "Different Jerry" }), jerryChangeVector);

        await assertThrows(() => inMemorySession.registerExternalLoadedIntoTheSession(documentInfo), err => {
            assertThat(err.name).isEqualTo("InvalidOperationException");
            assertThat(err.message).contains("is already in the session with a different entity instance");
        });
    });

    it("shouldAllowReregisteringSameEntityInstance", async () => {
        await storeEmployees(jerry);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        const jerryChangeVector = session.advanced.getChangeVectorFor(loadedJerry);

        const inMemorySession = session as unknown as InMemoryDocumentSessionOperations;
        inMemorySession.registerExternalLoadedIntoTheSession(
            externalDocumentInfo("employees/1-A", loadedJerry, jerryChangeVector));

        assertThat(trackedChangeVectors(session).get("employees/1-A")).isEqualTo(jerryChangeVector);
    });

    it("shouldTrackMultipleExternalEntities_andDetectConcurrencyViolations", async () => {
        await storeEmployees(jerry, ["employees/2-A", { firstName: "Egor" }], ["employees/3-A", { firstName: "Alice" }]);

        const session = openWritesAndReadsSession();
        await session.load("employees/1-A", Employee);

        const inMemorySession = session as unknown as InMemoryDocumentSessionOperations;

        const [externalEgor, egorCv] = await loadExternally("employees/2-A");
        inMemorySession.registerExternalLoadedIntoTheSession(externalDocumentInfo("employees/2-A", externalEgor, egorCv));

        const [alice, aliceCv] = await loadExternally("employees/3-A");
        inMemorySession.registerExternalLoadedIntoTheSession(externalDocumentInfo("employees/3-A", alice, aliceCv));

        const tracked = trackedChangeVectors(session);
        assertThat(tracked.has("employees/1-A")).isTrue();
        assertThat(tracked.has("employees/2-A")).isTrue();
        assertThat(tracked.has("employees/3-A")).isTrue();

        const actualAliceCv = await modifyInBackground("employees/3-A", a => a.firstName = "Alicia");

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message)
            .contains(`Document employees/3-A has change vector ${actualAliceCv}, but Put was called with change vector ${aliceCv}`);
        assertThat(error.id).isEqualTo("employees/3-A");
        assertThat(error.actualChangeVector).isEqualTo(actualAliceCv);
        assertThat(error.expectedChangeVector).isEqualTo(aliceCv);
    });

    it("shouldNotTrackExternalEntity_whenNoTrackingModeEnabled", async () => {
        await storeEmployees(jerry, ["employees/2-A", { firstName: "Egor" }]);

        const session = store.openSession({ noTracking: true });
        const inMemorySession = session as unknown as InMemoryDocumentSessionOperations;

        const [externalEgor, egorCv] = await loadExternally("employees/2-A");
        inMemorySession.registerExternalLoadedIntoTheSession(externalDocumentInfo("employees/2-A", externalEgor, egorCv));

        assertThat(trackedChangeVectors(session).has("employees/2-A")).isFalse();

        await modifyInBackground("employees/2-A", e => e.firstName = "Greg");

        await session.saveChanges();
    });

    async function assertBackgroundDeleteDetected(deleteById: boolean): Promise<void> {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        const loadedJerry = await session.load("employees/1-A", Employee);
        const expected = session.advanced.getChangeVectorFor(loadedJerry);

        {
            const s = store.openSession();
            if (deleteById) {
                await s.delete("employees/1-A");
            } else {
                await s.delete(await s.load("employees/1-A", Employee));
            }
            await s.saveChanges();
        }

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message).contains(
            `Document 'employees/1-A' has been modified since it was loaded. The expected change vector '${expected}' does not match the current change vector 'string.Empty'.`);
        assertThat(error.id).isEqualTo("employees/1-A");
        assertThat(error.actualChangeVector).isEqualTo("");
        assertThat(error.expectedChangeVector).isEqualTo(expected);

        await assertEgorStreet("Ahad Ha'am");
        await assertJerryDeleted();
    }

    it("shouldThrowConcurrencyException_whenTrackedEntityLoadedButThenWasDeletedInBackgroundSession", async () => {
        await assertBackgroundDeleteDetected(false);
    });

    it("shouldThrowConcurrencyException_whenTrackedEntityLoadedButThenWasDeletedByIdInBackgroundSession", async () => {
        await assertBackgroundDeleteDetected(true);
    });

    for (const [deleteById, deleteByIdInBackgroundSession] of [[true, true], [true, false], [false, true], [false, false]]) {
        it(`shouldThrowConcurrencyException_whenTrackedEntityLoadedButThenWasDeletedInBackgroundSession2 (deleteById: ${deleteById}, deleteByIdInBackgroundSession: ${deleteByIdInBackgroundSession})`, async () => {
            await storeEmployees(jerry, egor);

            const session = openWritesAndReadsSession();
            let expected: string = null;
            if (deleteByIdInBackgroundSession) {
                await session.delete("employees/1-A");
            } else {
                const loadedJerry = await session.load("employees/1-A", Employee);
                expected = session.advanced.getChangeVectorFor(loadedJerry);
                await session.delete(loadedJerry);
            }

            {
                const s = store.openSession();
                if (deleteById) {
                    await s.delete("employees/1-A");
                } else {
                    await s.delete(await s.load("employees/1-A", Employee));
                }
                await s.saveChanges();
            }

            if (deleteByIdInBackgroundSession) {
                await session.saveChanges();
            } else {
                const error = await saveChangesConcurrencyError(session);
                assertThat(error.message).contains("does not exist, but delete was called with change vector");
                assertThat(error.id).isEqualTo("employees/1-a");
                assertThat(error.actualChangeVector ?? null).isEqualTo(null);
                assertThat(error.expectedChangeVector).isEqualTo(expected);
            }

            await assertEgorStreet("Ahad Ha'am");
            await assertJerryDeleted();
        });
    }

    for (const sessionAction of sessionActions) {
        it(`shouldThrowConcurrencyException_whenOptimisticConcurrencyModeIsSetViaConventions (${sessionAction.name})`, async () => {
            await recreateStoreWithConventionsMode("WritesAndReads");
            await storeEmployees(jerry, egor);

            const session = store.openSession();
            const loadedJerry = await session.load("employees/1-A", Employee);

            await sessionAction(session);

            assertThat(session.advanced.getChangeVectorFor(loadedJerry)).isNotEmpty();

            await moveJerryToHaderaInBackground();

            const error = await saveChangesConcurrencyError(session);
            assertThat(error.message).contains("Document 'employees/1-A' has been modified");
            assertThat(error.id).isEqualTo("employees/1-A");

            await assertEgorStreet("Ahad Ha'am");
            await assertJerryCity("Hadera");
        });
    }

    it("sessionOptions_shouldOverride_conventions", async () => {
        await recreateStoreWithConventionsMode("WritesAndReads");
        await storeEmployees(jerry);

        const session = store.openSession({ optimisticConcurrencyMode: "None" });
        await session.load("employees/1-A", Employee);

        await moveJerryToHaderaInBackground();

        await session.saveChanges();
    });

    it("writesAndReads_shouldStillDetectConcurrencyOnReadOnlyEntity_whenModifiedEntityIsExcludedFromTrackCommand", async () => {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        await session.load("employees/1-A", Employee);
        const loadedEgor = await session.load("employees/2-A", Employee);

        loadedEgor.address = { street: "New Street" };

        await moveJerryToHaderaInBackground();

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message).contains("employees/1-A");
    });

    it("writesAndReads_shouldStillDetectConcurrencyOnModifiedEntity_viaPutCommand", async () => {
        await storeEmployees(jerry, egor);

        const session = openWritesAndReadsSession();
        await session.load("employees/1-A", Employee);
        const loadedEgor = await session.load("employees/2-A", Employee);

        loadedEgor.address = { street: "New Street" };

        await modifyInBackground("employees/2-A", e => e.address = { street: "Background Street" });

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message).contains("employees/2-A");
    });

    it("writesAndReads_concurrencyCheckModeDisabled_shouldStillBeTracked", async () => {
        await storeEmployees(jerry);

        const session = openWritesAndReadsSession();
        await session.load("employees/1-A", Employee);

        await session.store(Object.assign(new Employee(), { firstName: "NewEmployee" }), "employees/2-A", { changeVector: null });

        await modifyInBackground("employees/1-A", j => j.firstName = "Background");

        const error = await saveChangesConcurrencyError(session);
        assertThat(error.message).contains("employees/1-A");
    });
});
