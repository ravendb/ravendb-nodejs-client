import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    GetIndexNamesOperation,
    DisableIndexOperation,
    IndexingStatus,
    GetIndexingStatusOperation,
    IndexStatus,
    EnableIndexOperation,
    AbstractIndexCreationTask,
    IndexDefinition,
    GetIndexesOperation,
    GetIndexesStatisticsOperation,
    IndexStats,
} from "../../../src";
import { UsersIndex } from "../../Assets/Indexes";
import { TypeUtil } from "../../../src/Utility/TypeUtil";

describe("Index operations", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    let usersIndex: AbstractIndexCreationTask;

    beforeEach(() => {
        usersIndex = new UsersIndex();
    });

    it("can delete index", async () => {
        await usersIndex.execute(store);

        const indexNames = await store.maintenance.send(new GetIndexNamesOperation(0, 10));
        assert.ok(indexNames.find(x => x === "UsersIndex"));
    });

    it("can disable and enable index", async () => {
        await usersIndex.execute(store);

        await store.maintenance.send(new DisableIndexOperation(usersIndex.getIndexName()));
        let indexingStatus = await store.maintenance.send(new GetIndexingStatusOperation());
        const indexStatus: IndexStatus = indexingStatus.indexes[0];
        assert.equal(indexStatus.status, "Disabled");
        
        await store.maintenance.send(new EnableIndexOperation(usersIndex.getIndexName()));
        indexingStatus = await store.maintenance.send(new GetIndexingStatusOperation());
        assert.equal(indexingStatus.status, "Running");
    });

    it("can get indexes", async () => {
        await usersIndex.execute(store);
        const indexDefinitions: IndexDefinition[] = await store.maintenance.send(new GetIndexesOperation(0, 10));
        assert.equal(indexDefinitions.length, 1);
        assert.equal(indexDefinitions[0].constructor, IndexDefinition);
        assert.ok(TypeUtil.isSet(indexDefinitions[0].maps));
    });

    it("can get indexes stats", async () => {
        await usersIndex.execute(store);

        const indexStats: IndexStats[] = await store.maintenance.send(new GetIndexesStatisticsOperation());
        assert.equal(indexStats.length, 1);
        assert.ok(TypeUtil.isMap(indexStats[0].collections));
        assert.equal(indexStats[0].collections.size, 1);
    });

    class User {
        constructor(public name: string) {}
    }

    it.only("can get terms", async () => {
        await usersIndex.execute(store);

        const session = store.openSession();
        const user = new User("Marcin");
        session.store(user);
        await session.saveChanges();

        globalContext.waitForIndexing(store, store.database);
        
    });

//             try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName("Marcin");
//                 session.store(user);
//                 session.saveChanges();
//             }

//             waitForIndexing(store, store.getDatabase());

//             String[] terms = store.maintenance().send(new GetTermsOperation("UsersIndex", "name", null));

//             assertThat(terms)
//                     .hasSize(1)
//                     .contains("marcin");
//         }

//     }


});

//     @Test
//     public void hasIndexChanged() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             IndexesFromClientTest.UsersIndex index = new IndexesFromClientTest.UsersIndex();
//             IndexDefinition indexDef = index.createIndexDefinition();

//             store.maintenance().send(new PutIndexesOperation(indexDef));

//             assertThat(store.maintenance().send(new IndexHasChangedOperation(indexDef)))
//                     .isFalse();

//             indexDef.setMaps(Sets.newHashSet("from users"));

//             assertThat(store.maintenance().send(new IndexHasChangedOperation(indexDef)))
//                     .isTrue();
//         }
//     }

//     @Test
//     public void canStopStartIndexing() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             IndexesFromClientTest.UsersIndex index = new IndexesFromClientTest.UsersIndex();
//             IndexDefinition indexDef = index.createIndexDefinition();

//             store.maintenance().send(new PutIndexesOperation(indexDef));

//             store.maintenance().send(new StopIndexingOperation());

//             IndexingStatus indexingStatus = store.maintenance().send(new GetIndexingStatusOperation());

//             assertThat(indexingStatus.getStatus())
//                     .isEqualTo(IndexRunningStatus.PAUSED);

//             store.maintenance().send(new StartIndexingOperation());

//             indexingStatus = store.maintenance().send(new GetIndexingStatusOperation());

//             assertThat(indexingStatus.getStatus())
//                     .isEqualTo(IndexRunningStatus.RUNNING);

//         }
//     }

//     @Test
//     public void canStopStartIndex() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             IndexesFromClientTest.UsersIndex index = new IndexesFromClientTest.UsersIndex();
//             IndexDefinition indexDef = index.createIndexDefinition();

//             store.maintenance().send(new PutIndexesOperation(indexDef));

//             store.maintenance().send(new StopIndexOperation(indexDef.getName()));

//             IndexingStatus indexingStatus = store.maintenance().send(new GetIndexingStatusOperation());

//             assertThat(indexingStatus.getStatus())
//                     .isEqualTo(IndexRunningStatus.RUNNING);
//             assertThat(indexingStatus.getIndexes()[0].getStatus())
//                     .isEqualTo(IndexRunningStatus.PAUSED);

//             store.maintenance().send(new StartIndexOperation(indexDef.getName()));

//             indexingStatus = store.maintenance().send(new GetIndexingStatusOperation());

//             assertThat(indexingStatus.getStatus())
//                     .isEqualTo(IndexRunningStatus.RUNNING);
//             assertThat(indexingStatus.getIndexes()[0].getStatus())
//                     .isEqualTo(IndexRunningStatus.RUNNING);

//         }
//     }

//     @Test
//     public void canSetIndexLockMode() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             IndexesFromClientTest.UsersIndex index = new IndexesFromClientTest.UsersIndex();
//             IndexDefinition indexDef = index.createIndexDefinition();

//             store.maintenance().send(new PutIndexesOperation(indexDef));

//             store.maintenance().send(new SetIndexesLockOperation(indexDef.getName(), IndexLockMode.LOCKED_ERROR));
//             IndexDefinition newIndexDef = store.maintenance().send(new GetIndexOperation(indexDef.getName()));

//             assertThat(newIndexDef.getLockMode())
//                     .isEqualTo(IndexLockMode.LOCKED_ERROR);
//         }
//     }

//     @Test
//     public void canSetIndexPriority() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             IndexesFromClientTest.UsersIndex index = new IndexesFromClientTest.UsersIndex();
//             IndexDefinition indexDef = index.createIndexDefinition();

//             store.maintenance().send(new PutIndexesOperation(indexDef));

//             store.maintenance().send(new SetIndexesPriorityOperation(indexDef.getName(), IndexPriority.HIGH));
//             IndexDefinition newIndexDef = store.maintenance().send(new GetIndexOperation(indexDef.getName()));

//             assertThat(newIndexDef.getPriority())
//                     .isEqualTo(IndexPriority.HIGH);
//         }
//     }

//     @Test
//     public void canListErrors() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             UsersInvalidIndex index = new UsersInvalidIndex();
//             IndexDefinition indexDef = index.createIndexDefinition();

//             store.maintenance().send(new PutIndexesOperation(indexDef));

//             try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName(null);
//                 user.setAge(0);
//                 session.store(user);
//                 session.saveChanges();
//             }

//             waitForIndexing(store, store.getDatabase());

//             IndexErrors[] indexErrors = store.maintenance().send(new GetIndexErrorsOperation());
//             IndexErrors[] perIndexErrors = store.maintenance().send(new GetIndexErrorsOperation(new String[] { indexDef.getName() }));

//             assertThat(indexErrors)
//                     .hasSize(1);

//             assertThat(perIndexErrors)
//                     .hasSize(1);
//         }
//     }

//     @Test
//     public void canGetIndexStatistics() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             Users_Index index = new Users_Index();
//             IndexDefinition indexDef = index.createIndexDefinition();

//             store.maintenance().send(new PutIndexesOperation(indexDef));

//             try (IDocumentSession session = store.openSession()) {
//                 User user = new User();
//                 user.setName(null);
//                 user.setAge(0);
//                 session.store(user);
//                 session.saveChanges();
//             }

//             waitForIndexing(store, store.getDatabase());

//             IndexStats stats = store.maintenance().send(new GetIndexStatisticsOperation(indexDef.getName()));
//             assertThat(stats.getEntriesCount())
//                     .isEqualTo(1);
//         }
//     }

//     public static class Users_Index extends AbstractIndexCreationTask {
//         public Users_Index() {
//             map = "from u in docs.Users select new { u.name }";
//         }
//     }

//     public static class UsersInvalidIndex extends AbstractIndexCreationTask {
//         public UsersInvalidIndex() {
//             map = "from u in docs.Users select new { a = 5 / u.Age }";
//         }
//     }
// }