import { IDocumentSession, IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Bridge {
    public aggregates: string[];
}

class Root {
    public id: string;
    public bridge: Bridge;
}

class Aggregate {
    public id: string;
    public name: string;
}

describe("Stacey2", function () {

    let store: IDocumentStore;

    beforeEach(async () => store = await testContext.getDocumentStore());

    afterEach(async () => await disposeTestDocumentStore(store));

    function openOptimisticSession(): IDocumentSession {
        const session = store.openSession();
        session.advanced.useOptimisticConcurrency = true;
        return session;
    }

    it("load with include", async () => {
        const aggregate = Object.assign(new Aggregate(), { name: "First" });

        {
            const session = openOptimisticSession();
            await session.store(aggregate);
            await session.saveChanges();
        }

        const root = Object.assign(new Root(), {
            bridge: Object.assign(new Bridge(), { aggregates: [aggregate.id] })
        });

        {
            const session = openOptimisticSession();
            await session.store(root);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const item = await session.load("aggregates/1-A", Aggregate);
            assertThat(item).isNotNull();
        }

        {
            const session = openOptimisticSession();
            const query = await session.include("bridge.aggregates").load("roots/1-A", Root);
            assertThat(query).isNotNull();
        }

        for (let i = 0; i < 2; i++) {
            const session = openOptimisticSession();
            const query = await session.include("bridge.aggregates").load("roots/1-A", Root);
            await session.load("aggregates/1-A", Aggregate);

            assertThat(query).isNotNull();
            assertThat(session.advanced.numberOfRequests).isEqualTo(1);
        }
    });
});
