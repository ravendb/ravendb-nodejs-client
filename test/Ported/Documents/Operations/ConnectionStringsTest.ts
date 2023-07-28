import {
    IDocumentStore,
    PutConnectionStringOperation,
    RavenConnectionString,
    SqlConnectionString,
    GetConnectionStringsOperation,
    RemoveConnectionStringOperation, OlapConnectionString
} from "../../../../src";
import { disposeTestDocumentStore, testContext } from "../../../Utils/TestUtil";
import { assertThat } from "../../../Utils/AssertExtensions";


describe("ConnectionStringsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canCreateGetAndDeleteConnectionStrings", async () => {
        const ravenConnectionString1 = Object.assign(new RavenConnectionString(), {
            database: "db1",
            topologyDiscoveryUrls: ["http://localhost:8080"],
            name: "r1"
        });

        const sqlConnectionString1 = Object.assign(new SqlConnectionString(), {
            factoryName: "MySql.Data.MySqlClient",
            connectionString: "test",
            name: "s1"
        });

        const olapConnectionString1 = Object.assign(new OlapConnectionString(), {
            name: "o1",
        });

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(ravenConnectionString1));
        await store.maintenance.send(new PutConnectionStringOperation(sqlConnectionString1));
        await store.maintenance.send(new PutConnectionStringOperation(olapConnectionString1));

        assertThat(putResult.raftCommandIndex)
            .isGreaterThan(0);

        const connectionStrings = await store.maintenance.send(new GetConnectionStringsOperation());
        assertThat(connectionStrings.ravenConnectionStrings)
            .hasSize(1);
        assertThat(connectionStrings.ravenConnectionStrings["r1"] instanceof RavenConnectionString)
            .isTrue();

        assertThat(connectionStrings.sqlConnectionStrings)
            .hasSize(1);
        assertThat(connectionStrings.sqlConnectionStrings["s1"] instanceof SqlConnectionString)
            .isTrue();

        assertThat(connectionStrings.olapConnectionStrings)
            .hasSize(1);
        assertThat(connectionStrings.olapConnectionStrings["o1"] instanceof OlapConnectionString)
            .isTrue();

        const ravenOnly = await store.maintenance.send(
            new GetConnectionStringsOperation("r1", "Raven"));

        assertThat(ravenOnly.ravenConnectionStrings)
            .hasSize(1);
        assertThat(ravenOnly.ravenConnectionStrings["r1"] instanceof RavenConnectionString)
            .isTrue();
        assertThat(ravenOnly.sqlConnectionStrings)
            .hasSize(0);

        const sqlOnly = await store.maintenance.send(
            new GetConnectionStringsOperation("s1", "Sql"));

        assertThat(sqlOnly.ravenConnectionStrings)
            .hasSize(0);
        assertThat(sqlOnly.sqlConnectionStrings["s1"] instanceof SqlConnectionString)
            .isTrue();
        assertThat(sqlOnly.sqlConnectionStrings)
            .hasSize(1);

        const olapOnly = await store.maintenance.send(
            new GetConnectionStringsOperation("o1", "Olap"));

        assertThat(olapOnly.ravenConnectionStrings)
            .hasSize(0);
        assertThat(olapOnly.sqlConnectionStrings)
            .hasSize(0);
        assertThat(olapOnly.olapConnectionStrings["o1"] instanceof OlapConnectionString)
            .isTrue();
        assertThat(olapOnly.olapConnectionStrings)
            .hasSize(1);

        const removeResult = await store.maintenance.send(new RemoveConnectionStringOperation(Object.values(sqlOnly.sqlConnectionStrings)[0]));
        assertThat(removeResult.raftCommandIndex)
            .isGreaterThan(0);

        const afterDelete = await store.maintenance.send(
            new GetConnectionStringsOperation("s1", "Sql"));

        assertThat(afterDelete.ravenConnectionStrings)
            .hasSize(0);
        assertThat(afterDelete.sqlConnectionStrings)
            .hasSize(0);
    });

});
