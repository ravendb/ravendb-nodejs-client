import { DocumentStore, GetCompareExchangeValuesOperation, SessionOptions } from "../../../../src";
import { ClusterTestContext, RavenTestContext, } from "../../../Utils/TestUtil";
import { assertThat } from "../../../Utils/AssertExtensions";

(RavenTestContext.isPullRequest ? describe.skip : describe)("AtomicClusterReadWriteTest", function () {

    let testContext: ClusterTestContext;

    beforeEach(async function () {
        testContext = new ClusterTestContext();
    });

    afterEach(async () => testContext.dispose());

    it("clusterWideTransaction_WhenStore_ShouldCreateCompareExchange", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {
            const database = testContext.getDatabaseName();

            const numberOfNodes = 3;

            await cluster.createDatabase(database, numberOfNodes, cluster.getInitialLeader().url);

            const store = new DocumentStore(cluster.getInitialLeader().url, database);
            try {
                store.initialize();

                const sessionOptions: SessionOptions = {
                    transactionMode: "ClusterWide"
                };

                const entity = new TestObj();

                {
                    const session = store.openSession(sessionOptions);
                    await session.store(entity);
                    await session.saveChanges();
                }

                const result = await store.operations.send(new GetCompareExchangeValuesOperation({
                    clazz: TestObj,
                    startWith: ""
                }));

                assertThat(result)
                    .hasSize(1);
                assertThat(Object.keys(result)[0])
                    .endsWith(entity.id.toLocaleLowerCase());
            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    });

    it("clusterWideTransaction_WhenDisableAndStore_ShouldNotCreateCompareExchange", async () => {
        const cluster = await testContext.createRaftCluster(3);
        try {
            const database = testContext.getDatabaseName();

            const numberOfNodes = 3;

            await cluster.createDatabase(database, numberOfNodes, cluster.getInitialLeader().url);

            const store = new DocumentStore(cluster.getInitialLeader().url, database);
            try {
                store.initialize();

                const sessionOptions: SessionOptions = {
                    transactionMode: "ClusterWide",
                    disableAtomicDocumentWritesInClusterWideTransaction: true
                };

                const entity = new TestObj();

                {
                    const session = store.openSession(sessionOptions);
                    await session.store(entity);
                    await session.saveChanges();
                }

                const result = await store.operations.send(new GetCompareExchangeValuesOperation({
                    clazz: TestObj,
                    startWith: ""
                }));

                assertThat(result)
                    .hasSize(0);

            } finally {
                store.dispose();
            }
        } finally {
            cluster.dispose();
        }
    })
});

class TestObj {
    public id: string;
    public prop: string;
}