import {
    IDocumentStore,
    CreateDatabaseOperation,
    DeleteDatabasesOperation,
    GetDatabaseRecordOperation,
    GetServerWideConnectionStringsOperation,
    PutServerWideConnectionStringOperation,
    RavenConnectionString,
    RemoveServerWideConnectionStringOperation,
    ServerWideConnectionString
} from "../../../../../../src/index.js";
import { disposeTestDocumentStore, RavenTestContext, testContext } from "../../../../../Utils/TestUtil.js";
import { assertThat, assertThrows } from "../../../../../Utils/AssertExtensions.js";

const SERVER_WIDE_PREFIX = "Server Wide Connection String, ";

let createdNames: string[] = [];

(RavenTestContext.isPullRequest || !RavenTestContext.isRavenDbServerVersion("7.2") ? describe.skip : describe)("ServerWideConnectionStringsTest", function () {
    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async function () {
        // server-wide entries propagate to every database on the server; remove what each test created
        for (const name of createdNames) {
            await store.maintenance.server.send(
                new RemoveServerWideConnectionStringOperation(
                    Object.assign(new RavenConnectionString(), { name })));
        }
        createdNames = [];

        await disposeTestDocumentStore(store);
    });

    it("canCreateAndGetServerWideConnectionString", async function () {
        const ravenCS = createServerWideRavenConnectionString(store.database);

        const putResult = await store.maintenance.server.send(new PutServerWideConnectionStringOperation(ravenCS));
        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const getResult = await store.maintenance.server.send(
            new GetServerWideConnectionStringsOperation(ravenCS.name, "Raven"));
        assertThat(getResult.results.length)
            .isEqualTo(1);
        assertThat(getResult.results[0].name)
            .isEqualTo(ravenCS.name);
        assertThat(getResult.results[0].type)
            .isEqualTo("Raven");

        const innerCS = getResult.results[0].connectionString as RavenConnectionString;
        assertThat(innerCS.database)
            .isEqualTo("TargetDb");
        assertThat(innerCS.topologyDiscoveryUrls[0])
            .isEqualTo("http://localhost:8080");

        // the server stores the round-tripped ToJson() which always writes ExcludedDatabases; revived as null, not undefined
        assertThat(getResult.results[0].excludedDatabases)
            .isNull();
    });

    it("getAllReturnsServerWideConnectionStrings", async function () {
        const ravenCS = createServerWideRavenConnectionString(store.database);
        await store.maintenance.server.send(new PutServerWideConnectionStringOperation(ravenCS));

        const allResult = await store.maintenance.server.send(new GetServerWideConnectionStringsOperation());
        assertThat(allResult.results.map(x => x.name))
            .contains(ravenCS.name);
    });

    it("serverWideConnectionStringPropagatedToDatabases", async function () {
        const db2Name = store.database + "_second";
        await store.maintenance.server.send(new CreateDatabaseOperation({ databaseName: db2Name }));

        try {
            const ravenCS = createServerWideRavenConnectionString(store.database);
            await store.maintenance.server.send(new PutServerWideConnectionStringOperation(ravenCS));

            const expectedName = SERVER_WIDE_PREFIX + ravenCS.name;

            const record1 = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
            assertThat(record1.ravenConnectionStrings[expectedName])
                .isNotNull();
            assertThat(record1.ravenConnectionStrings[expectedName].database)
                .isEqualTo("TargetDb");

            const record2 = await store.maintenance.server.send(new GetDatabaseRecordOperation(db2Name));
            assertThat(record2.ravenConnectionStrings[expectedName])
                .isNotNull();

            // databases created after the put also receive the propagated entry
            const newDbName = store.database + "_new";
            await store.maintenance.server.send(new CreateDatabaseOperation({ databaseName: newDbName }));

            try {
                const newRecord = await store.maintenance.server.send(new GetDatabaseRecordOperation(newDbName));
                assertThat(newRecord.ravenConnectionStrings[expectedName])
                    .isNotNull();
            } finally {
                await store.maintenance.server.send(new DeleteDatabasesOperation({
                    databaseNames: [newDbName],
                    hardDelete: true
                }));
            }
        } finally {
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [db2Name],
                hardDelete: true
            }));
        }
    });

    it("canUpdateServerWideConnectionString", async function () {
        const ravenCS = createServerWideRavenConnectionString(store.database);
        await store.maintenance.server.send(new PutServerWideConnectionStringOperation(ravenCS));

        const updatedCS = new RavenConnectionString();
        updatedCS.name = ravenCS.name;
        updatedCS.database = "UpdatedDb";
        updatedCS.topologyDiscoveryUrls = ["http://localhost:9090"];
        ravenCS.connectionString = updatedCS;

        const updateResult = await store.maintenance.server.send(new PutServerWideConnectionStringOperation(ravenCS));
        assertThat(updateResult.raftCommandIndex)
            .isGreaterThan(0);

        const expectedName = SERVER_WIDE_PREFIX + ravenCS.name;
        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.ravenConnectionStrings[expectedName].database)
            .isEqualTo("UpdatedDb");
        assertThat(record.ravenConnectionStrings[expectedName].topologyDiscoveryUrls[0])
            .isEqualTo("http://localhost:9090");

        const getResult = await store.maintenance.server.send(
            new GetServerWideConnectionStringsOperation(ravenCS.name, "Raven"));
        assertThat(getResult.results.length)
            .isEqualTo(1);
        assertThat((getResult.results[0].connectionString as RavenConnectionString).database)
            .isEqualTo("UpdatedDb");
    });

    it("canDeleteServerWideConnectionString", async function () {
        const ravenCS = createServerWideRavenConnectionString(store.database);
        await store.maintenance.server.send(new PutServerWideConnectionStringOperation(ravenCS));

        const expectedName = SERVER_WIDE_PREFIX + ravenCS.name;
        const record = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(record.ravenConnectionStrings[expectedName])
            .isNotNull();

        const removeCS = new RavenConnectionString();
        removeCS.name = ravenCS.name;
        const deleteResult = await store.maintenance.server.send(
            new RemoveServerWideConnectionStringOperation(removeCS));
        assertThat(deleteResult.raftCommandIndex)
            .isGreaterThan(0);

        const getResult = await store.maintenance.server.send(
            new GetServerWideConnectionStringsOperation(ravenCS.name, "Raven"));
        assertThat(getResult.results.length)
            .isEqualTo(0);

        const recordAfterDelete = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
        assertThat(recordAfterDelete.ravenConnectionStrings[expectedName])
            .isUndefined();
    });

    it("deletingNonExistentServerWideConnectionStringIsNoOp", async function () {
        const removeCS = new RavenConnectionString();
        removeCS.name = "DoesNotExist";

        const deleteResult = await store.maintenance.server.send(
            new RemoveServerWideConnectionStringOperation(removeCS));
        assertThat(deleteResult.raftCommandIndex)
            .isGreaterThan(0);

        const getResult = await store.maintenance.server.send(
            new GetServerWideConnectionStringsOperation("DoesNotExist", "Raven"));
        assertThat(getResult.results.length)
            .isEqualTo(0);
    });

    it("excludedDatabasesRespected", async function () {
        const db2Name = store.database + "_excluded";
        await store.maintenance.server.send(new CreateDatabaseOperation({ databaseName: db2Name }));

        try {
            const ravenCS = createServerWideRavenConnectionString(store.database);
            ravenCS.excludedDatabases = [db2Name];
            await store.maintenance.server.send(new PutServerWideConnectionStringOperation(ravenCS));

            const expectedName = SERVER_WIDE_PREFIX + ravenCS.name;

            const record1 = await store.maintenance.server.send(new GetDatabaseRecordOperation(store.database));
            assertThat(record1.ravenConnectionStrings[expectedName])
                .isNotNull();

            const record2 = await store.maintenance.server.send(new GetDatabaseRecordOperation(db2Name));
            assertThat(record2.ravenConnectionStrings[expectedName])
                .isUndefined();

            // clearing the excluded list propagates the connection string to the previously-excluded database
            ravenCS.excludedDatabases = undefined;
            await store.maintenance.server.send(new PutServerWideConnectionStringOperation(ravenCS));

            const record2AfterClear = await store.maintenance.server.send(new GetDatabaseRecordOperation(db2Name));
            assertThat(record2AfterClear.ravenConnectionStrings[expectedName])
                .isNotNull();
        } finally {
            await store.maintenance.server.send(new DeleteDatabasesOperation({
                databaseNames: [db2Name],
                hardDelete: true
            }));
        }
    });

    it("clientSideConstructorThrows", async function () {
        await assertThrows(async () => new PutServerWideConnectionStringOperation(null), err => {
            assertThat(err.name)
                .isEqualTo("ArgumentNullException");
        });

        await assertThrows(async () => new PutServerWideConnectionStringOperation({} as ServerWideConnectionString), err => {
            assertThat(err.name)
                .isEqualTo("ArgumentNullException");
        });

        await assertThrows(async () => new GetServerWideConnectionStringsOperation("", "Raven"), err => {
            assertThat(err.name)
                .isEqualTo("InvalidArgumentException");
        });

        await assertThrows(async () => new RemoveServerWideConnectionStringOperation(null), err => {
            assertThat(err.name)
                .isEqualTo("ArgumentNullException");
        });

        await assertThrows(async () => new RemoveServerWideConnectionStringOperation(new RavenConnectionString()), err => {
            assertThat(err.name)
                .isEqualTo("InvalidArgumentException");
        });
    });
});

function createServerWideRavenConnectionString(databaseSuffix: string): ServerWideConnectionString {
    const name = "MyRavenCS_" + databaseSuffix;
    createdNames.push(name);

    const ravenCS = new ServerWideConnectionString();
    const cs = new RavenConnectionString();
    cs.name = name;
    cs.database = "TargetDb";
    cs.topologyDiscoveryUrls = ["http://localhost:8080"];
    ravenCS.connectionString = cs;
    return ravenCS;
}
