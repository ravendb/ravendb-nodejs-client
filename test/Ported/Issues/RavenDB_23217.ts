import { addDays } from "date-fns";
import {
    CONSTANTS,
    ConfigureRevisionsOperation,
    GetDocumentsCommand,
    IDocumentStore,
    RevisionsCollectionConfiguration,
    RevisionsConfiguration
} from "../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class User {
    public id: string;
    public name: string;
    public names: string[];
}

(RavenTestContext.isPullRequest ? describe.skip : describe)("RavenDB_23217", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("Shuould Include One Revision When Using RevisionBefore Only On GetDocumentsCommand", async () => {
        await setupRevisions();
        await storeFourRevisions();

        const command = new GetDocumentsCommand({
            ids: ["Docs/1"],
            revisionIncludeByDateTimeBefore: addDays(new Date(), 15),
            metadataOnly: false,
            conventions: store.conventions
        });

        await store.getRequestExecutor().execute(command);

        assertThat(command.result.revisionIncludes).hasSize(1);
    });

    it("Shuouldnt Stop Including Revisions After Encounter Not Existed Revision", async () => {
        await setupRevisions();
        await storeFourRevisions();

        {
            const session = store.openSession();
            const revisionsChangeVectors = (await session.advanced.revisions.getMetadataFor("Docs/1"))
                .map(metadata => metadata[CONSTANTS.Documents.Metadata.CHANGE_VECTOR] as string);

            await session.store(Object.assign(new User(), {
                name: revisionsChangeVectors[0],
                names: [revisionsChangeVectors[0], "ABC", revisionsChangeVectors[1]]
            }), "Docs/1");
            await session.saveChanges();
        }

        const command = new GetDocumentsCommand({
            ids: ["Docs/1"],
            revisionsIncludesByChangeVector: ["name", "names"],
            metadataOnly: false,
            conventions: store.conventions
        });

        await store.getRequestExecutor().execute(command);

        assertThat(command.result.revisionIncludes).hasSize(2);
    });

    async function setupRevisions() {
        const configuration = new RevisionsConfiguration();
        configuration.defaultConfig = Object.assign(new RevisionsCollectionConfiguration(), {
            disabled: false,
            minimumRevisionsToKeep: 100
        });
        await store.maintenance.send(new ConfigureRevisionsOperation(configuration));
    }

    async function storeFourRevisions() {
        for (const name of ["Old", "New", "New1", "New2"]) {
            const session = store.openSession();
            await session.store(Object.assign(new User(), { name }), "Docs/1");
            await session.saveChanges();
        }
    }
});
