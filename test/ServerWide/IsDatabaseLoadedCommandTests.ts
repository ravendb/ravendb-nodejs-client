import assert from "node:assert"
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil.js";

import {
    IDocumentStore,
    GetStatisticsOperation,
    IsDatabaseLoadedCommand,
    ToggleDatabasesStateOperation
} from "../../src/index.js";

describe("IsDatabaseLoadedCommand", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    const isLoaded = async () => {
        const command = new IsDatabaseLoadedCommand();
        await store.getRequestExecutor().execute(command);
        assert.strictEqual(command.result.databaseName, store.database);
        return command.result.isLoaded;
    };

    it("reports whether the database is loaded", async () => {
        const session = store.openSession();
        await session.store({ name: "John" }, "users/1");
        await session.saveChanges();

        assert.strictEqual(await isLoaded(), true);

        await store.maintenance.server.send(new ToggleDatabasesStateOperation(store.database, true));
        assert.strictEqual(await testContext.waitForValue(isLoaded, false), false);

        await store.maintenance.server.send(new ToggleDatabasesStateOperation(store.database, false));
        await store.maintenance.send(new GetStatisticsOperation());

        assert.strictEqual(await isLoaded(), true);
    });
});
