import assert from "node:assert"
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil.js";

import {
    IDocumentStore,
} from "../../../src/index.js";
import { Order, OrderLine } from "../../Assets/Entities.js";

describe("Load test", function () {

    let store: IDocumentStore;

    class Foo {
        public name: string;
    }

    class Bar {
        public fooId: string;
        public fooIDs: string[];
        public name: string;
    }

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can load with includes", async () => {
        const session = store.openSession();
        let foo = Object.assign(new Foo(), { name: "Beginning" });
        await session.store(foo);

        const fooId = session.advanced.getDocumentId(foo);
        const bar = Object.assign(new Bar(), { name: "End", fooId });
        await session.store(bar);

        const barId = session.advanced.getDocumentId(bar);
        await session.saveChanges();

        const newSession = store.openSession();
        const bars = await (newSession
            .include("fooId")
            .load<Bar>([barId], Bar));

        assert.ok(bars);
        assert.strictEqual(Object.keys(bars).length, 1);
        assert.ok(bars[barId]);

        const numOfRequests = newSession.advanced.numberOfRequests;

        foo = await newSession.load<Foo>(bars[barId].fooId, { documentType: Foo });

        assert.ok(foo);
        assert.strictEqual(foo.name, "Beginning");
        assert.strictEqual(newSession.advanced.numberOfRequests, numOfRequests);
    });

    it("can load with includes and missing document", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new Bar(), { name: "End", fooId: "somefoo/1" }), "bars/1");
        await session.saveChanges();

        const newSession = store.openSession();
        const bars = await newSession
            .include("fooId")
            .load<Bar>(["bars/1"], Bar);

        assert.strictEqual(Object.keys(bars).length, 1);
        assert.ok(bars["bars/1"]);

        const numOfRequests = newSession.advanced.numberOfRequests;

        const foo = await newSession.load<Foo>(bars["bars/1"].fooId, Foo);

        assert.strictEqual(foo, null);
        assert.strictEqual(newSession.advanced.numberOfRequests, numOfRequests);
    });

    it("loads includes of an already loaded document", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new Foo(), { name: "Beginning" }), "foos/1");
        await session.store(Object.assign(new Bar(), { name: "End", fooId: "foos/1" }), "bars/1");
        await session.saveChanges();

        const newSession = store.openSession();
        await newSession.load<Bar>("bars/1", Bar);

        const numOfRequests = newSession.advanced.numberOfRequests;

        const bar = await newSession.include("fooId").load<Bar>("bars/1", Bar);

        assert.strictEqual(newSession.advanced.numberOfRequests, numOfRequests + 1);

        const foo = await newSession.load<Foo>(bar.fooId, Foo);

        assert.strictEqual(foo.name, "Beginning");
        assert.strictEqual(newSession.advanced.numberOfRequests, numOfRequests + 1);
    });

    it("does not treat a document as missing when the server ignores the include path", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new Foo(), { name: "Beginning" }), "foos/1");
        const line = Object.assign(new OrderLine(), { product: "foos/1" });
        await session.store(Object.assign(new Order(), { lines: [line] }), "orders/1");
        await session.saveChanges();

        const newSession = store.openSession();
        await newSession.include("lines[0].product").load<Order>("orders/1", Order);

        const foo = await newSession.load<Foo>("foos/1", Foo);

        assert.strictEqual(foo?.name, "Beginning");
    });

    it("does not request includes again when the included id is empty", async () => {
        const session = store.openSession();
        await session.store(Object.assign(new Bar(), { name: "End", fooId: "" }), "bars/1");
        await session.saveChanges();

        const newSession = store.openSession();
        await newSession.include("fooId").load<Bar>("bars/1", Bar);

        const numOfRequests = newSession.advanced.numberOfRequests;

        await newSession.include("fooId").load<Bar>("bars/1", Bar);

        assert.strictEqual(newSession.advanced.numberOfRequests, numOfRequests);
    });
});
