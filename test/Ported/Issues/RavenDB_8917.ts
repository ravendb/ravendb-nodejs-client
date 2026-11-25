import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class ApplicationFiles {
    public excluded: string[];
    public ignored: string[];
}

class ApplicationState {
    public files: ApplicationFiles;
    public name: string;
}

const DOC_ID = "test";

function applicationFiles(excluded: string[], ignored: string[]) {
    const files = new ApplicationFiles();
    files.excluded = excluded;
    files.ignored = ignored;
    return files;
}

describe("RavenDB_8917", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    async function storeApplicationState(files: ApplicationFiles) {
        const session = store.openSession();
        const state = new ApplicationState();
        state.name = "Grisha";
        state.files = files;
        await session.store(state, DOC_ID);
        await session.saveChanges();
    }

    it("can change from null to array", async () => {
        await storeApplicationState(applicationFiles(null, ["aa", "bb"]));

        const session = store.openSession();
        const application = await session.load(DOC_ID, ApplicationState);
        application.files = applicationFiles(["1", "2"], ["aa", "bb"]);

        const changes = session.advanced.whatChanged();
        assertThat(changes).hasSize(1);
        assertThat(changes[DOC_ID]).hasSize(1);

        assertThat(changes[DOC_ID][0].fieldName).isEqualTo("excluded");
        assertThat(changes[DOC_ID][0].change).isEqualTo("FieldChanged");
        assertThat(changes[DOC_ID][0].fieldOldValue).isEqualTo(null);
        assertThat(JSON.stringify(changes[DOC_ID][0].fieldNewValue)).isEqualTo("[\"1\",\"2\"]");

        await session.saveChanges();
    });

    it("can change from array to null", async () => {
        await storeApplicationState(applicationFiles(["aa", "bb"], ["aa", "bb"]));

        const session = store.openSession();
        const application = await session.load(DOC_ID, ApplicationState);
        application.files = applicationFiles(null, ["1", "2"]);

        await session.saveChanges();
    });
});
