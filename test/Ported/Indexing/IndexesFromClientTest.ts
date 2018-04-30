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
    GetIndexNamesOperation,
    GetStatisticsOperation,
} from "../../../src";
import { DeleteIndexOperation } from "../../../src/Documents/Operations/Indexes/DeleteIndexOperation";

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

    it("can execute many indexes", async () => {
            await store.executeIndexes([new UsersIndex()]);

            const indexNamesOperation = new GetIndexNamesOperation(0, 10);
            const indexNames = await store.maintenance.send(indexNamesOperation);

            assert.equal(indexNames.length, 1);
    });

    it("can delete index", async () => {
        const index = new UsersIndex();
        await store.executeIndex(index);

        await store.maintenance.send(new DeleteIndexOperation(index.getIndexName()));

        const command = new GetStatisticsCommand();
        await (store.getRequestExecutor().execute(command));

        const statistics = command.result;

        assert.equal(statistics.indexes.length, 0);
    });

    it("can explain query", async () => {

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
        throw new Error("Implement after query is done.");
    });

});