import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RavenTestContext, testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
} from "../../../src";

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
        let barId: string;
        const session = store.openSession();
        let foo = Object.assign(new Foo(), { name: "Beginning" });
        await session.store(foo);

        const fooId = session.advanced.getDocumentId(foo);
        const bar = Object.assign(new Bar(), { name: "End", fooId });
        await session.store(bar);

        barId = session.advanced.getDocumentId(bar);
        await session.saveChanges();

        const newSession = store.openSession();
        const bars = await (newSession
            .include("fooId")
            .load<Bar>([barId], Bar));

        assert.ok(bars);
        assert.equal(Object.keys(bars).length, 1);
        assert.ok(bars[barId]);

        const numOfRequests = newSession.advanced.numberOfRequests;

        foo = await newSession.load<Foo>(bars[barId].fooId, { documentType: Foo });

        assert.ok(foo);
        assert.equal(foo.name, "Beginning");
        assert.equal(newSession.advanced.numberOfRequests, numOfRequests);
    });
});

//     @Test
//     @Disabled("waiting for IncludesUtils")
//     public void loadWithIncludesAndMissingDocument() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {

//             String barId;

//             try (IDocumentSession session = store.openSession()) {
//                 Bar bar = new Bar();
//                 bar.setName("End");
//                 bar.setFooId("somefoo/1");

//                 session.store(bar);
//                 barId = session.advanced().getDocumentId(bar);
//                 session.saveChanges();
//             }

//             try (IDocumentSession newSession = store.openSession()) {
//                 Map<String, Bar> bar = newSession.include("fooId")
//                         .load(Bar.class, new String[] { barId });

//                 assertThat(bar)
//                         .isNotNull()
//                         .hasSize(1);

//                 assertThat(bar.get(barId))
//                         .isNotNull();

//                 int numOfRequests = newSession.advanced().getNumberOfRequests();

//                 Foo foo = newSession.load(Foo.class, bar.get(barId).getFooId());

//                 assertThat(foo)
//                         .isNull();

//                 assertThat(newSession.advanced().getNumberOfRequests())
//                         .isEqualTo(numOfRequests);
//             }
//         }
//     }
// }
