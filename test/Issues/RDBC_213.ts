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

    it("session.store() saves metadata using entity '@metadata' field", async () => {
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

    it("session.store() saves metadata using entity '@metadata' field when updating existing document", async () => {
        // Create document with metadata
        const session1 = store.openSession();
        const expiresAt = new Date(2019, 11, 12);
        const expiringDocument = {
            "name": "test",
            "@metadata": {
                "@expires": expiresAt.toISOString()
            }
        };

        await session1.store(expiringDocument);
        await session1.saveChanges();
        
        // Load document and update the metadata
        const session2 = store.openSession();
        let loadedDocument = await session2.load(expiringDocument["id"]);
        var metadata = session2.advanced.getMetadataFor(loadedDocument);
        
        const expiresAtNewTime = new Date(2020, 11, 12).toISOString();
        metadata["@expires"] = expiresAtNewTime;

        const customDataValue = "customDataValue";
        metadata["customData"] = customDataValue;
        
        await session2.saveChanges(); 

        // Verify
        const session3 = store.openSession();
        const updatedDocument = await session3.load(loadedDocument["id"]);
        
        assert.equal(updatedDocument["@metadata"]["@expires"], expiresAtNewTime);
        assert.equal(updatedDocument["@metadata"]["customData"], customDataValue);
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