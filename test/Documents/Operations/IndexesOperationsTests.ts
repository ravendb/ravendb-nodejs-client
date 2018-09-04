import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    GetIndexNamesOperation,
    DisableIndexOperation,
    GetIndexingStatusOperation,
    IndexStatus,
    EnableIndexOperation,
    AbstractIndexCreationTask,
    IndexDefinition,
    GetIndexesOperation,
    GetIndexesStatisticsOperation,
    IndexStats,
    GetTermsOperation,
    PutIndexesOperation,
    IndexHasChangedOperation,
    StopIndexingOperation,
    StartIndexingOperation,
    StopIndexOperation,
    StartIndexOperation,
    SetIndexesLockOperation,
    GetIndexOperation,
    SetIndexesPriorityOperation,
    GetIndexErrorsOperation,
    GetIndexStatisticsOperation,
} from "../../../src";
import { UsersIndex, UsersInvalidIndex, UsersIndexWithPascalCasedFields } from '../../Assets/Indexes';
import { TypeUtil } from "../../../src/Utility/TypeUtil";

describe("Index operations", function () {

    let store: IDocumentStore;

    class User {
        constructor(public name: string, public age?: number) { }
    }

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    let usersIndex: AbstractIndexCreationTask;
    let invalidUsersIndex: AbstractIndexCreationTask;
    let usersIndexWithPascalCasedFields: AbstractIndexCreationTask;

    beforeEach(() => {
        usersIndex = new UsersIndex();
        invalidUsersIndex = new UsersInvalidIndex();
        usersIndexWithPascalCasedFields = new UsersIndexWithPascalCasedFields();
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

    it("can get terms", async () => {
        await usersIndex.execute(store);

        const session = store.openSession();
        const user = new User("Marcin");
        await session.store(user);
        await session.saveChanges();

        await testContext.waitForIndexing(store, store.database);
        const terms: string[] = await store.maintenance.send(new GetTermsOperation("UsersIndex", "name", null));

        assert.equal(terms.length, 1);
        assert.equal(terms[0], "marcin");
    });

    it("can tell if index changed", async () => {
        const indexDef = usersIndex.createIndexDefinition();
        await store.maintenance.send(new PutIndexesOperation(indexDef));

        let hasIndexChanged = await store.maintenance.send(new IndexHasChangedOperation(indexDef));
        assert.ok(!hasIndexChanged);

        indexDef.maps = new Set(["from users"]);
        hasIndexChanged = await store.maintenance.send(new IndexHasChangedOperation(indexDef));
        assert.ok(hasIndexChanged);
    });

    it("can stop/start indexing", async () => {
        const indexDef = usersIndex.createIndexDefinition();
        await store.maintenance.send(new PutIndexesOperation(indexDef));
        await store.maintenance.send(new StopIndexingOperation());

        let indexingStatus = await store.maintenance.send(new GetIndexingStatusOperation());
        assert.equal(indexingStatus.status, "Paused");
        await store.maintenance.send(new StartIndexingOperation());
        indexingStatus = await store.maintenance.send(new GetIndexingStatusOperation());
        assert.equal(indexingStatus.status, "Running");
    });

    it("can stop/start index", async () => {
        const indexDef = usersIndex.createIndexDefinition();
        await store.maintenance.send(new PutIndexesOperation(indexDef));
        await store.maintenance.send(new StopIndexOperation(indexDef.name));

        let indexingStatus = await store.maintenance.send(new GetIndexingStatusOperation());
        assert.equal(indexingStatus.status, "Running");
        assert.equal(indexingStatus.indexes[0].status, "Paused");

        await store.maintenance.send(new StartIndexOperation(indexDef.name));
        indexingStatus = await store.maintenance.send(new GetIndexingStatusOperation());
        assert.equal(indexingStatus.status, "Running");
        assert.equal(indexingStatus.indexes[0].status, "Running");

    });

    it("can set index lock mode", async () => {
        const indexDef = usersIndex.createIndexDefinition();
        await store.maintenance.send(new PutIndexesOperation(indexDef));
        await store.maintenance.send(new SetIndexesLockOperation(indexDef.name, "LockedError"));

        const newIndexDef = await store.maintenance.send(new GetIndexOperation(indexDef.name));
        assert.equal(newIndexDef.lockMode, "LockedError");
    });

    it("can set index priority", async () => {
        const indexDef = usersIndex.createIndexDefinition();
        await store.maintenance.send(new PutIndexesOperation(indexDef));
        await store.maintenance.send(new SetIndexesPriorityOperation(indexDef.name, "High"));

        const newIndexDef = await store.maintenance.send(new GetIndexOperation(indexDef.name));
        assert.equal(newIndexDef.priority, "High");
    });

    it("can list errors", async () => {
        const indexDef = invalidUsersIndex.createIndexDefinition();

        await store.maintenance.send(new PutIndexesOperation(indexDef));

        const session = store.openSession();
        const user = new User(null, 0);
        await session.store(user);
        await session.saveChanges();

        await testContext.waitForIndexing(store, store.database, null, false);

        const indexErrors = await store.maintenance.send(new GetIndexErrorsOperation());
        const perIndexErrors = await store.maintenance.send(new GetIndexErrorsOperation([indexDef.name]));

        assert.equal(indexErrors.length, 1);
        assert.equal(perIndexErrors.length, 1);
    });

    it("can get index statistics", async () => {
        const indexDef = usersIndex.createIndexDefinition();
        await store.maintenance.send(new PutIndexesOperation(indexDef));

        const session = store.openSession();
        const user = new User(null, 0);
        await session.store(user);
        await session.saveChanges();

        await testContext.waitForIndexing(store, store.database);
        const stats = await store.maintenance.send(new GetIndexStatisticsOperation(indexDef.name));
        assert.equal(stats.entriesCount, 1);
    });

    it("can get index with Pascal-cased fields", async () => {
        const indexDef = usersIndexWithPascalCasedFields.createIndexDefinition();
        await store.maintenance.send(new PutIndexesOperation(indexDef));

        const newIndexDef = await store.maintenance.send(new GetIndexOperation(indexDef.name));
        assert.ok(newIndexDef.fields["Name"]);
        assert.ok(!newIndexDef.fields["name"]);
    })

});
