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
    IndexQuery,
    ExplainQueryCommand,
} from "../../../src";
import { DeleteIndexOperation } from "../../../src/Documents/Operations/Indexes/DeleteIndexOperation";
import { QueryStatistics } from "../../../src/Documents/Session/QueryStatistics";

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

        const user1 = Object.assign(new User(), { name: "Fitzchack" });
        const user2 = Object.assign(new User(), { name: "Arek" });

        {
            const session = store.openSession();
            await session.store(user1);
            await session.store(user2);
            await session.saveChanges();
        }

        {
            // make queries to create auto indexes 
            const session = store.openSession();
            let stats: QueryStatistics;
            let users = await session.query<User>(User)
                .statistics(_stats => stats = _stats)
                .whereEquals("name", "Arek")
                .all();
            
            users = await session.query<User>(User)
                .statistics(_stats => stats = _stats)
                .whereGreaterThan("age", 10)
                .all();
        }

        const indexQuery = new IndexQuery("from users");
        const command = new ExplainQueryCommand(store.conventions, indexQuery);

        await store.getRequestExecutor().execute(command);

        const explanations = command.result;
        assert.equal(explanations.length, 1);
        assert.ok(explanations[0].index);
        assert.ok(explanations[0].reason);
    });
});