import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { SessionBeforeStoreEventArgs } from "../../../src/Documents/Session/SessionEvents";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_14276", function () {

    let store: IDocumentStore;

    let _dictionary: Record<string, Record<string, number>>;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();

        _dictionary = {};
        const firstMap: Record<string, number> = {};
        firstMap["aaaa"] = 1;

        const secondMap: Record<string, number> = {}
        secondMap["bbbb"] = 2;

        _dictionary["123"] = firstMap;
        _dictionary["321"] = secondMap;
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can_Update_Metadata_With_Nested_Dictionary", async () => {
        store.addSessionListener("beforeStore", event => onBeforeStore(event));

        const docId = "users/1";

        {
            const session = store.openSession();
            const user = Object.assign(new User(), {
                name: "Some document"
            });

            await session.store(user, docId);

            const metadata = session.advanced.getMetadataFor(user);
            metadata["Custom-Metadata"] = _dictionary;

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const user = await session.load<User>(docId, User);
            user.name = "Updated document";
            await session.saveChanges();
        }

        await verifyData(store, docId);
    });

    it("can_Update_Metadata_With_Nested_Dictionary_Same_Session", async () => {
        store.addSessionListener("beforeStore", event => onBeforeStore(event));

        const docId = "users/1";

        {
            const session = store.openSession();
            const savedUser = Object.assign(new User(), {
                name: "Some document"
            });

            await session.store(savedUser, docId);

            const metadata = session.advanced.getMetadataFor(savedUser);
            metadata["Custom-Metadata"] = _dictionary;

            await session.saveChanges();

            const user = await session.load<User>(docId, User);
            user.name = "Updated document";
            await session.saveChanges();
        }

        await verifyData(store, docId);
    });
});

function onBeforeStore(eventArgs: SessionBeforeStoreEventArgs) {
    if (eventArgs.getDocumentMetadata()["Some-MetadataEntry"]) {
        const metadata = eventArgs.session.getMetadataFor(eventArgs.getEntity());
        metadata["Some-MetadataEntry"] = "Updated";
    } else {
        eventArgs.getDocumentMetadata()["Some-MetadataEntry"] = "Created";
    }
}

async function verifyData(store: IDocumentStore, docId: string) {
    {
        const session = store.openSession();
        const user = await session.load<User>(docId, User);
        assertThat(user.name)
            .isEqualTo("Updated document");

        const metadata = session.advanced.getMetadataFor(user);
        const dictionary = metadata["Custom-Metadata"];
        let nestedDictionary = dictionary["123"];

        assertThat(nestedDictionary["aaaa"])
            .isEqualTo(1);

        nestedDictionary = dictionary["321"];
        assertThat(nestedDictionary["bbbb"])
            .isEqualTo(2);
    }
}
