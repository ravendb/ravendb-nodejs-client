import assert from "node:assert";
import { copyFile, mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
    DocumentConventions,
    DocumentStore,
    GetBuildNumberOperation,
    GetStatisticsOperation,
    IDocumentStore
} from "../../../src/index.js";
import { getTopologyHash } from "../../../src/Http/TopologyLocalCache.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";

describe("RavenDB_11825", function () {

    let store: IDocumentStore;
    let cacheLocation: string;

    beforeEach(async function () {
        cacheLocation = await mkdtemp(join(tmpdir(), "raven-topology-cache-"));
        testContext.customizeStore = async s => {
            s.conventions.disableTopologyCache = false;
            s.conventions.topologyCacheLocation = cacheLocation;
        };
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => {
        testContext.customizeStore = null;
        await disposeTestDocumentStore(store);
        await rm(cacheLocation, { recursive: true, force: true });
    });

    it("topologyCacheIsDisabledByDefault", () => {
        assert.strictEqual(new DocumentConventions().disableTopologyCache, true);
    });

    it("canChangeTopologyCacheLocation", async () => {
        await store.maintenance.send(new GetStatisticsOperation());
        await store.maintenance.server.send(new GetBuildNumberOperation());

        const files = await readdir(cacheLocation);
        assert.ok(files.some(x => x.endsWith(".raven-database-topology")), files.join(", "));
        assert.ok(files.some(x => x.endsWith(".raven-cluster-topology")), files.join(", "));
    });

    it("usesTheCachedTopologyWhenNoInitialUrlIsReachable", async () => {
        await store.maintenance.send(new GetStatisticsOperation());

        const unreachableUrl = "http://127.0.0.1:1";
        await copyFile(
            join(cacheLocation, `${store.database}.${getTopologyHash(store.urls)}.raven-database-topology`),
            join(cacheLocation, `${store.database}.${getTopologyHash([unreachableUrl])}.raven-database-topology`));

        const storeWithUnreachableUrl = new DocumentStore(unreachableUrl, store.database);
        storeWithUnreachableUrl.conventions.disableTopologyCache = false;
        storeWithUnreachableUrl.conventions.topologyCacheLocation = cacheLocation;
        storeWithUnreachableUrl.initialize();

        try {
            const statistics = await storeWithUnreachableUrl.maintenance.send(new GetStatisticsOperation());
            assert.ok(statistics.databaseId);
        } finally {
            storeWithUnreachableUrl.dispose();
        }
    });
});
