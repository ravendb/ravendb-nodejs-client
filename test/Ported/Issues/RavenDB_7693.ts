import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

class ProjectTask {
    public id: string;
    public property1: string;
    public property2: string;
    public property3: string;
    public property4: string;
    public issues: string[] = [];
}

describe("RavenDB_7693", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    it("save entity with empty list after load", async () => {
        let projectTaskId: string;

        {
            const session = store.openSession();
            const projectTask = new ProjectTask();
            projectTask.property1 = "1";
            projectTask.property2 = "2";
            projectTask.property3 = "3";
            projectTask.property4 = "4";

            await session.store(projectTask);
            await session.saveChanges();

            projectTaskId = projectTask.id;
        }

        {
            const session = store.openSession();
            await session.load(projectTaskId, ProjectTask);
            await session.saveChanges();
        }
    });
});
