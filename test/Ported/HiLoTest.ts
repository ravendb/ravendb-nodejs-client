import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { RemoteTestContext, globalContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    HiloIdGenerator,
} from "../../src";

describe.only("HiLo", function () {

    class HiLoDoc {
        // tslint:disable-next-line:variable-name
        public Max: number;
    }

    class Product {
        public productName: string;
    }

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("cannot go down", async () => {
        const session = store.openSession();
        const hiloDoc: HiLoDoc = Object.assign(new HiLoDoc(), { Max: 32 });

        await session.store(hiloDoc, "Raven/Hilo/users");
        await session.saveChanges();

        const hiLoKeyGenerator = new HiloIdGenerator(store, store.database, "users");
        const ids = [];
        const firstNextId = await hiLoKeyGenerator.nextId();
        ids.push(firstNextId);

        hiloDoc.Max = 12;
        await session.store(hiloDoc, "Raven/Hilo/users", {
            changeVector: null
        });
        await session.saveChanges();
        for (let i = 0; i < 128; i++) {
            const nextId = await hiLoKeyGenerator.nextId();
            assert.ok(!ids.includes(nextId));
            ids.push(nextId);
        }

        assert.equal(new Set(ids).size, ids.length);

    });

    it ("can operate with multiple DBs", async () => {
        throw new Error("TODO");
    })
});

//     @Test
//     public void hiLoMultiDb() throws Exception {
//         try (DocumentStore store = getDocumentStore()) {

//             try (IDocumentSession session = store.openSession()) {
//                 HiloDoc hiloDoc = new HiloDoc();
//                 hiloDoc.setMax(64);
//                 session.store(hiloDoc, "Raven/Hilo/users");

//                 HiloDoc productsHilo = new HiloDoc();
//                 productsHilo.setMax(128);
//                 session.store(productsHilo, "Raven/Hilo/products");

//                 session.saveChanges();

//                 MultiDatabaseHiLoIdGenerator multiDbHilo = new MultiDatabaseHiLoIdGenerator(store, store.getConventions());
//                 String generateDocumentKey = multiDbHilo.generateDocumentId(null, new User());
//                 assertThat(generateDocumentKey)
//                         .isEqualTo("users/65-A");

//                 generateDocumentKey = multiDbHilo.generateDocumentId(null, new Product());
//                 assertThat(generateDocumentKey)
//                         .isEqualTo("products/129-A");

//             }
//         }
//     }

//     @Test
//     public void capacityShouldDouble() throws Exception {
//         try (DocumentStore store = getDocumentStore()) {

//             HiLoIdGenerator hiLoIdGenerator = new HiLoIdGenerator("users", store, store.getDatabase(), store.getConventions().getIdentityPartsSeparator());

//             try (IDocumentSession session = store.openSession()) {
//                 HiloDoc hiloDoc = new HiloDoc();
//                 hiloDoc.setMax(64);
//                 session.store(hiloDoc, "Raven/Hilo/users");
//                 session.saveChanges();

//                 for (int i = 0; i < 32; i++) {
//                     hiLoIdGenerator.generateDocumentId(new User());
//                 }
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 HiloDoc hiloDoc = session.load(HiloDoc.class, "Raven/Hilo/users");
//                 long max = hiloDoc.getMax();
//                 assertThat(max)
//                         .isEqualTo(96);

//                 //we should be receiving a range of 64 now
//                 hiLoIdGenerator.generateDocumentId(new User());
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 HiloDoc hiloDoc = session.load(HiloDoc.class, "Raven/Hilo/users");
//                 long max = hiloDoc.getMax();
//                 assertThat(max)
//                         .isEqualTo(160);
//             }
//         }
//     }

//     @Test
//     public void returnUnusedRangeOnClose() throws Exception {
//         try (DocumentStore store = getDocumentStore()) {

//             DocumentStore newStore = new DocumentStore();
//             newStore.setUrls(store.getUrls());
//             newStore.setDatabase(store.getDatabase());

//             newStore.initialize();

//             try (IDocumentSession session = newStore.openSession()) {
//                 HiloDoc hiloDoc = new HiloDoc();
//                 hiloDoc.setMax(32);
//                 session.store(hiloDoc, "Raven/Hilo/users");

//                 session.saveChanges();

//                 session.store(new User());
//                 session.store(new User());

//                 session.saveChanges();
//             }

//             newStore.close(); //on document store close, hilo-return should be called


//             newStore = new DocumentStore();
//             newStore.setUrls(store.getUrls());
//             newStore.setDatabase(store.getDatabase());

//             newStore.initialize();

//             try (IDocumentSession session = newStore.openSession()) {
//                 HiloDoc hiloDoc = session.load(HiloDoc.class, "Raven/Hilo/users");
//                 long max = hiloDoc.getMax();
//                 assertThat(max)
//                         .isEqualTo(34);
//             }

//             newStore.close(); //on document store close, hilo-return should be called
//         }
//     }
// }
