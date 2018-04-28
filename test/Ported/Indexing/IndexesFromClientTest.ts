import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { 
    RemoteTestContext, 
    globalContext, 
    disposeTestDocumentStore 
} from "../../Utils/TestUtil";
import { UsersIndex } from "../../Assets/Indexes";
import { User } from "../../Assets/Entities";
import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    GetStatisticsCommand,
    DatabaseStatistics,
    ResetIndexOperation,
} from "../../../src";

describe("Indexes from client", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can reset", async () => {
        {
            const session = store.openSession();
            const user1 = Object.assign(new User(), {
                name: "Marcin"
            });
            await session.store(user1, "users/1");
            await session.saveChanges();
        }

        await store.executeIndex(new UsersIndex());
        await globalContext.waitForIndexing(store);

        const command = new GetStatisticsCommand();
        await (store.getRequestExecutor().execute(command));

        const statistics: DatabaseStatistics = command.result;
        const firstIndexingTime = statistics.indexes[0].lastIndexingTime;

        const indexName = new UsersIndex().getIndexName();

        await BluebirdPromise.delay(2000);

        await store.maintenance.send(new ResetIndexOperation(indexName));
        await globalContext.waitForIndexing(store);

        const command2 = new GetStatisticsCommand();
        await (store.getRequestExecutor().execute(command2));

        const statistics2: DatabaseStatistics = command2.result;
        const secondIndexingTime = statistics2.indexes[0].lastIndexingTime;

        assert.ok(firstIndexingTime.valueOf() < secondIndexingTime.valueOf());
    });
});

//     @Test
//     public void canExecuteManyIndexes() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndexes(Collections.singletonList(new UsersIndex()));

//             GetIndexNamesOperation indexNamesOperation = new GetIndexNamesOperation(0, 10);
//             String[] indexNames = store.maintenance().send(indexNamesOperation);

//             assertThat(indexNames)
//                     .hasSize(1);
//         }
//     }

//     public static class UsersIndex extends AbstractIndexCreationTask {
//         public UsersIndex() {
//             map = "from user in docs.users select new { user.name }";
//         }
//     }

//     @Test
//     public void canDelete() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             store.executeIndex(new UsersIndex());

//             store.maintenance().send(new DeleteIndexOperation(new UsersIndex().getIndexName()));

//             GetStatisticsOperation.GetStatisticsCommand command = new GetStatisticsOperation.GetStatisticsCommand();
//             store.getRequestExecutor().execute(command);

//             DatabaseStatistics statistics = command.getResult();

//             assertThat(statistics.getIndexes())
//                     .hasSize(0);
//         }
//     }

//     //TBD public async Task CanStopAndStart()
//     //TBD public async Task SetLockModeAndSetPriority()
//     //TBD public async Task GetErrors()
//     //TBD public async Task GetDefinition()
//     //TBD public async Task GetTerms()
//     //TBD public async Task Performance()
//     //TBD public async Task GetIndexNames()

//     @Test
//     public void canExplain() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             User user1 = new User();
//             user1.setName("Fitzchak");

//             User user2 = new User();
//             user2.setName("Arek");

//             try (IDocumentSession session = store.openSession()) {
//                 session.store(user1);
//                 session.store(user2);
//                 session.saveChanges();
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Reference<QueryStatistics> statsRef = new Reference<>();
//                 List<User> users = session.query(User.class)
//                         .statistics(statsRef)
//                         .whereEquals("name", "Arek")
//                         .toList();

//                 users = session.query(User.class)
//                         .statistics(statsRef)
//                         .whereGreaterThan("age", 10)
//                         .toList();
//             }

//             IndexQuery indexQuery = new IndexQuery("from users");
//             ExplainQueryCommand command = new ExplainQueryCommand(store.getConventions(), indexQuery);

//             store.getRequestExecutor().execute(command);

//             ExplainQueryCommand.ExplainQueryResult[] explanations = command.getResult();
//             assertThat(explanations)
//                     .hasSize(1);
//             assertThat(explanations[0].getIndex())
//                     .isNotNull();
//             assertThat(explanations[0].getReason())
//                     .isNotNull();
//         }
//     }

//     //TBD public async Task MoreLikeThis()
// }
