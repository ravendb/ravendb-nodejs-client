import { CONSTANTS, IDocumentStore, IMetadataDictionary } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { User } from "../../Assets/Entities.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

const { Metadata } = CONSTANTS.Documents;

const reservedMetadataKeys = new Set<string>([
    Metadata.COLLECTION,
    Metadata.ID,
    Metadata.CHANGE_VECTOR,
    Metadata.LAST_MODIFIED,
    Metadata.RAVEN_JS_TYPE,
    Metadata.NESTED_OBJECT_TYPES
]);

function clearMetadata(metadata: IMetadataDictionary) {
    for (const key of Object.keys(metadata)) {
        if (!reservedMetadataKeys.has(key)) {
            delete metadata[key];
        }
    }
}

describe("RavenDB_17996", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    async function storeUser(metadata?: Record<string, string>) {
        const session = store.openSession();
        const user = new User();
        await session.store(user);
        if (metadata) {
            Object.assign(session.advanced.getMetadataFor(user), metadata);
        }
        await session.saveChanges();
        return user.id;
    }

    async function assertRequestCount(
        id: string, action: (metadata: IMetadataDictionary) => void, requestCountEqual: boolean) {
        const session = store.openSession();
        const entity = await session.load(id, User);
        const metadata = session.advanced.getMetadataFor(entity);

        const requestsBefore = session.advanced.numberOfRequests;

        action(metadata);

        await session.saveChanges();

        if (requestCountEqual) {
            assertThat(session.advanced.numberOfRequests).isEqualTo(requestsBefore);
        } else {
            assertThat(session.advanced.numberOfRequests).isNotEqualTo(requestsBefore);
        }
    }

    it("metadata that didnt change doesnt cause saveChanges", async () => {
        const id = await storeUser();

        await assertRequestCount(id, metadata => [...Object.entries(metadata)], true);
        await assertRequestCount(id, metadata => metadata[Metadata.COLLECTION] = "Users", true);
        await assertRequestCount(id, metadata => delete metadata[Metadata.REFRESH], true);
        await assertRequestCount(id, metadata => Object.assign({}, metadata), true);
    });

    it("metadata that changed caused saveChanges", async () => {
        const id = await storeUser();

        await assertRequestCount(id, metadata => delete metadata[Metadata.LAST_MODIFIED], true);
        await assertRequestCount(id, metadata => metadata[Metadata.LAST_MODIFIED] = "Users", true);
        await assertRequestCount(id, metadata => {
            metadata[Metadata.LAST_MODIFIED] = null;
            metadata[Metadata.LAST_MODIFIED] = "Users";
        }, true);
        await assertRequestCount(id, metadata => metadata["@1234"] = "Users", false);
        await assertRequestCount(id, metadata => metadata["@sfddfdsf"] = "fgffffg", false);
        await assertRequestCount(id, metadata => metadata["@ewewrewr"] = "fdsfdgfdg", false);
    });

    it("metadata clear caused saveChanges", async () => {
        const id = await storeUser({ test: "1" });

        {
            const session = store.openSession();
            const entity = await session.load(id, User);
            const metadata = session.advanced.getMetadataFor(entity);

            const requestsBefore = session.advanced.numberOfRequests;

            clearMetadata(metadata);

            await session.saveChanges();

            assertThat(session.advanced.numberOfRequests).isNotEqualTo(requestsBefore);
        }

        {
            const session = store.openSession();
            const user = await session.load(id, User);
            const metadata = session.advanced.getMetadataFor(user);

            assertThat(Object.keys(metadata).includes("test")).isFalse();
        }
    });

    it("metadata clear that didnt change doesnt cause saveChanges", async () => {
        const id = await storeUser();

        const session = store.openSession();
        const entity = await session.load(id, User);
        const metadata = session.advanced.getMetadataFor(entity);

        const requestsBefore = session.advanced.numberOfRequests;

        clearMetadata(metadata);

        await session.saveChanges();

        assertThat(session.advanced.numberOfRequests).isEqualTo(requestsBefore);
    });
});
