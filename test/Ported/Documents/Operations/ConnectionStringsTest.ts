import {
    IDocumentStore,
    PutConnectionStringOperation,
    RavenConnectionString,
    SqlConnectionString,
    GetConnectionStringsOperation,
    RemoveConnectionStringOperation, OlapConnectionString, ElasticSearchConnectionString, QueueConnectionString
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

        const elasticSearchConnectionString = Object.assign(new ElasticSearchConnectionString(), {
            name: "e1",
            nodes: ["http://127.0.0.1:8080"]
        });

        const kafkaConnectionString = Object.assign(new QueueConnectionString(), {
            name: "k1",
            brokerType: "Kafka",
            kafkaConnectionSettings: {
                bootstrapServers: "localhost:9092"
            }
        });

        const rabbitConnectionString = Object.assign(new QueueConnectionString(), {
            name: "r1",
            brokerType: "RabbitMq",
            rabbitMqConnectionSettings: {
                connectionString: "localhost:888"
            }
        });

        const olapConnectionString1 = Object.assign(new OlapConnectionString(), {
            name: "o1",
        });

        const putResult = await store.maintenance.send(new PutConnectionStringOperation(ravenConnectionString1));
        await store.maintenance.send(new PutConnectionStringOperation(sqlConnectionString1));
        await store.maintenance.send(new PutConnectionStringOperation(elasticSearchConnectionString));
        await store.maintenance.send(new PutConnectionStringOperation(kafkaConnectionString));
        await store.maintenance.send(new PutConnectionStringOperation(rabbitConnectionString));
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

        assertThat(connectionStrings.elasticSearchConnectionStrings)
            .hasSize(1);
        assertThat(connectionStrings.elasticSearchConnectionStrings["e1"] instanceof ElasticSearchConnectionString)
            .isTrue();

        assertThat(connectionStrings.queueConnectionStrings)
            .hasSize(2);
        assertThat(connectionStrings.queueConnectionStrings["k1"] instanceof QueueConnectionString)
            .isTrue();
        assertThat(connectionStrings.queueConnectionStrings["r1"] instanceof QueueConnectionString)
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

        const elasticOnly = await store.maintenance.send(new GetConnectionStringsOperation("e1", "ElasticSearch"));
        assertThat(elasticOnly.ravenConnectionStrings)
            .hasSize(0);
        assertThat(elasticOnly.elasticSearchConnectionStrings)
            .hasSize(1);


        const olapOnly = await store.maintenance.send(
            new GetConnectionStringsOperation("o1", "Olap"));

        const rabbitOnly = await store.maintenance.send(new GetConnectionStringsOperation("r1", "Queue"));
        assertThat(rabbitOnly.ravenConnectionStrings)
            .hasSize(0);
        assertThat(rabbitOnly.queueConnectionStrings)
            .hasSize(1);
        assertThat(rabbitOnly.queueConnectionStrings["r1"] instanceof QueueConnectionString)
            .isTrue();

        const kafkaOnly = await store.maintenance.send(new GetConnectionStringsOperation("k1", "Queue"));
        assertThat(kafkaOnly.ravenConnectionStrings)
            .hasSize(0);
        assertThat(kafkaOnly.queueConnectionStrings)
            .hasSize(1);
        assertThat(kafkaOnly.queueConnectionStrings["k1"] instanceof QueueConnectionString)
            .isTrue();

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
