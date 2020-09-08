import {
    IDocumentStore,
    PutConnectionStringOperation,
    SqlConnectionString,
    AddEtlOperation,
    UpdateEtlOperation,
    ResetEtlOperation,
    SqlEtlConfiguration, SqlEtlTable, Transformation, GetOngoingTaskInfoOperation
} from "../../../../../src";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../../Utils/TestUtil";
import { User } from "../../../../Assets/Entities";
import { assertThat } from "../../../../Utils/AssertExtensions";
import { OngoingTaskSqlEtlDetails } from "../../../../../src/Documents/Operations/OngoingTasks/OngoingTask";

(RavenTestContext.isPullRequest ? describe.skip : describe)(
    `${RavenTestContext.isPullRequest ? "[Skipped on PR] " : ""}` +
    "SqlTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canAddEtl", async () => {
        await insertDocument(store);
        const result = await createConnectionString(store);

        assertThat(result)
            .isNotNull();

        const transformation = {
            applyToAllDocuments: true,
            name: "Script #1"
        } as Transformation;

        const table1 = {
            documentIdColumn: "Id",
            insertOnlyMode: false,
            tableName: "Users"
        } as SqlEtlTable;

        const etlConfiguration = Object.assign(new SqlEtlConfiguration(), {
            connectionStringName: "toDst",
            disabled: false,
            name: "etlToDst",
            transforms: [ transformation ],
            sqlTables: [ table1 ]
        } as Partial<SqlEtlConfiguration>);

        const operation = new AddEtlOperation(etlConfiguration);
        const etlResult = await store.maintenance.send(operation);
        assertThat(etlResult)
            .isNotNull();

        assertThat(etlResult.raftCommandIndex)
            .isGreaterThan(0);
        assertThat(etlResult.taskId)
            .isGreaterThan(0);

        // and try to read ongoing sql task

        const ongoingTask = await store.maintenance.send(new GetOngoingTaskInfoOperation(etlResult.taskId, "SqlEtl")) as OngoingTaskSqlEtlDetails;

        assertThat(ongoingTask)
            .isNotNull();

        assertThat(ongoingTask.taskId)
            .isEqualTo(etlResult.taskId);
        assertThat(ongoingTask.taskType)
            .isEqualTo("SqlEtl");
        assertThat(ongoingTask.responsibleNode)
            .isNotNull();
        assertThat(ongoingTask.taskState)
            .isEqualTo("Enabled");
        assertThat(ongoingTask.taskName)
            .isEqualTo("etlToDst");

        const configuration = ongoingTask.configuration;
        const transforms = configuration.transforms;
        assertThat(transforms)
            .hasSize(1);
        assertThat(transforms[0].applyToAllDocuments)
            .isTrue();

        assertThat(configuration.sqlTables)
            .hasSize(1);
        assertThat(configuration.sqlTables[0].tableName)
            .isEqualTo("Users");
    });

    it("canAddEtlWithScript", async () => {
        await insertDocument(store);
        const result = await createConnectionString(store);

        assertThat(result)
            .isNotNull();

        const transformation = {
            applyToAllDocuments: false,
            collections: [ "Users" ],
            name: "Script #1",
            script: "loadToUsers(this);"
        } as Transformation;

        const table1 = {
            documentIdColumn: "Id",
            insertOnlyMode: false,
            tableName: "Users"
        } as SqlEtlTable;

        const etlConfiguration = Object.assign(new SqlEtlConfiguration(), {
            connectionStringName: "toDst",
            disabled: false,
            name: "etlToDst",
            transforms: [ transformation ],
            sqlTables: [ table1 ]
        } as Partial<SqlEtlConfiguration>);

        const operation = new AddEtlOperation(etlConfiguration);
        const etlResult = await store.maintenance.send(operation);
        assertThat(etlResult)
            .isNotNull();

        assertThat(etlResult.raftCommandIndex)
            .isGreaterThan(0);
        assertThat(etlResult.taskId)
            .isGreaterThan(0);
    });

    it("canUpdateEtl", async () => {
        await insertDocument(store);
        const result = await createConnectionString(store);

        assertThat(result)
            .isNotNull();

        const transformation = {
            applyToAllDocuments: false,
            collections: [ "Users" ],
            name: "Script #1",
            script: "loadToUsers(this);"
        } as Transformation;

        const table1 = {
            documentIdColumn: "Id",
            insertOnlyMode: false,
            tableName: "Users"
        } as SqlEtlTable;

        const etlConfiguration = Object.assign(new SqlEtlConfiguration(), {
            connectionStringName: "toDst",
            disabled: false,
            name: "etlToDst",
            transforms: [ transformation ],
            sqlTables: [ table1 ]
        } as Partial<SqlEtlConfiguration>);

        const operation = new AddEtlOperation(etlConfiguration);
        const etlResult = await store.maintenance.send(operation);

        // now change ETL configuration

        transformation.collections = [ "Cars" ];
        transformation.script = "loadToCars(this)";

        const updateResult = await store.maintenance.send(new UpdateEtlOperation(etlResult.taskId, etlConfiguration));
        assertThat(updateResult)
            .isNotNull();

        assertThat(updateResult.raftCommandIndex)
            .isGreaterThan(0);
        assertThat(updateResult.taskId)
            .isGreaterThan(0);
    });

    it("canResetEtlTask", async () => {
        await insertDocument(store);
        const result = await createConnectionString(store);

        assertThat(result)
            .isNotNull();

        const transformation = {
            applyToAllDocuments: true,
            name: "Script Q&A",
        } as Transformation;

        const table1 = {
            documentIdColumn: "Id",
            insertOnlyMode: false,
            tableName: "Users"
        } as SqlEtlTable;

        const etlConfiguration = Object.assign(new SqlEtlConfiguration(), {
            connectionStringName: "toDst",
            disabled: false,
            name: "etlToDst",
            transforms: [ transformation ],
            sqlTables: [ table1 ]
        } as Partial<SqlEtlConfiguration>);

        const operation = new AddEtlOperation(etlConfiguration);
        const etlResult = await store.maintenance.send(operation);

        assertThat(etlResult)
            .isNotNull();

        assertThat(etlResult.raftCommandIndex)
            .isGreaterThan(0);
        assertThat(etlResult.taskId)
            .isGreaterThan(0);

        await store.maintenance.send(
            new ResetEtlOperation("etlToDst", "Script Q&A"));

        // we don't assert against real database
    });
});

function createConnectionString(src: IDocumentStore) {
    const toDstLink = Object.assign(new SqlConnectionString(), {
        name: "toDst",
        factoryName: "MySql.Data.MySqlClient",
        connectionString: "hostname=localhost;user=root;password="
    } as Partial<SqlConnectionString>);

    return src.maintenance.send(new PutConnectionStringOperation(toDstLink));
}

async function insertDocument(src: IDocumentStore) {
    const session = src.openSession();

    const user1 = Object.assign(new User(), {
        name: "Marcin"
    });
    await session.store(user1, "users/1");
    await session.saveChanges();
}