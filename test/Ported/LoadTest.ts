import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
} from "../../src";

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
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can load with includes", async () => {
        let barId: string;

        let session = store.openSession();
        let foo = Object.assign(new Foo(), { name: "Beginning" });
        await session.store(foo);

        let fooId = session.advanced.getDocumentId(foo);


    });
});


//             try (IDocumentSession session = store.openSession()) {
//                 Foo foo = new Foo();
//                 foo.setName("Beginning");
//                 session.store(foo);

//                 String fooId = session.advanced().getDocumentId(foo);
//                 Bar bar = new Bar();
//                 bar.setName("End");
//                 bar.setFooId(fooId);

//                 session.store(bar);

//                 barId = session.advanced().getDocumentId(bar);
//                 session.saveChanges();
//             }

//             try (IDocumentSession newSession = store.openSession()) {
//                 Map<String, Bar> bar = newSession
//                         .include("fooId")
//                         .load(Bar.class, new String[]{barId});

//                 assertThat(bar)
//                         .isNotNull();

//                 assertThat(bar)
//                         .hasSize(1);

//                 assertThat(bar.get(barId))
//                         .isNotNull();

//                 int numOfRequests = newSession.advanced().getNumberOfRequests();

//                 Foo foo = newSession.load(Foo.class, bar.get(barId).getFooId());

//                 assertThat(foo)
//                         .isNotNull();

//                 assertThat(foo.getName())
//                         .isEqualTo("Beginning");

//                 assertThat(newSession.advanced().getNumberOfRequests())
//                         .isEqualTo(numOfRequests);
//             }
//         }
//     }


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
