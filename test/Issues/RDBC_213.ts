import { IDocumentStore } from "../../src";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import * as assert from "assert";

describe("[RDBC-213] Metadata is not saved", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it.skip("[NOT SUPPORTED YET] - session.store() saves metadata using entity '@metadata' field", async () => {
        const session = store.openSession();
        const expiresAt = new Date(2019, 11, 12);
        const expiringDocument = {
            "name": "test",
            "expires": expiresAt.toISOString(),
            "@metadata": {
                "@expires": expiresAt.toISOString()
            }
        };

        await session.store(expiringDocument);
        await session.saveChanges();

        const session2 = store.openSession();
        const loaded = await session2.load(expiringDocument["id"]);
        assert.equal(expiresAt.toISOString(), loaded["@metadata"]["@expires"]);
    });

    it("metadata is stored using session.advanced.getMetadataFor() and session.saveChanges()", async function () {
        const session = store.openSession();
        const expiresAt = new Date(2019, 11, 12);
        const expiringDocument = {
            name: "test",
            expires: expiresAt.toISOString()
        };

        await session.store(expiringDocument);

        const metadata = session.advanced.getMetadataFor(expiringDocument);
        metadata["@expires"] = expiresAt.toISOString();
        
        await session.saveChanges();

        const session2 = store.openSession();
        const loaded = await session2.load(expiringDocument["id"]);
        assert.equal(expiresAt.toISOString(), loaded["@metadata"]["@expires"]);
    });

});