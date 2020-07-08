import { GetConflictsCommand, IDocumentStore } from "../../../../src";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../Utils/TestUtil";
import { ModifyConflictSolverOperation } from "../../../../src/ServerWide/Operations/ModifyConflictSolverOperation";
import { assertThat } from "../../../Utils/AssertExtensions";
import { User } from "../../../Assets/Entities";
import { ReplicationTestContext } from "../../../Utils/ReplicationTestContext";

(RavenTestContext.isPullRequest ? describe : describe)("ConflictSolverTest", function () {

    let store: IDocumentStore;
    let replication: ReplicationTestContext;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        replication = new ReplicationTestContext();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("getConflictsResult_command_should_work_properly", async () => {
        let source: IDocumentStore;
        let destination: IDocumentStore;
        try {
            source = await testContext.getDocumentStore();

            try {
                destination = await testContext.getDocumentStore();

                const conflictSolverOperation = new ModifyConflictSolverOperation(destination.database, {}, false);
                const solverResult = await destination.maintenance.server.send(conflictSolverOperation);

                assertThat(solverResult)
                    .isNotNull();

                assertThat(solverResult.key)
                    .isEqualTo(destination.database);
                assertThat(solverResult.raftCommandIndex)
                    .isGreaterThan(0);

                {
                    const session = source.openSession();
                    const user1 = Object.assign(new User(), { name: "Value" });
                    await session.store(user1, "docs/1");
                    await session.saveChanges();
                }

                {
                    const session = destination.openSession();
                    const user1 = Object.assign(new User(), { name: "Value2" });

                    await session.store(user1, "docs/1");
                    await session.saveChanges();
                }

                await replication.setupReplication(source, destination);

                {
                    const session = source.openSession();
                    const user1 = Object.assign(new User(), { name: "Value" });
                    await session.store(user1, "marker");
                    await session.saveChanges();
                }

                await replication.waitForDocumentToReplicate(destination, "marker", 2_000, User);

                const command = new GetConflictsCommand("docs/1", destination.conventions);
                await destination.getRequestExecutor().execute(command);
                const conflicts = command.result;

                assertThat(conflicts.results)
                    .hasSize(2);

            } finally {
                destination.dispose();
            }
        } finally {
            source.dispose();
        }
    });

});
