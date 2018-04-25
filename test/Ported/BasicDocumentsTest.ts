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
} from "../../src";
import { User, Person } from "../Assets/Entities";

describe.only("Basic documents test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await globalContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("can change document collection with delete and save", async () => {
        const documentId = "users/1";
        const session = store.openSession();
        let user = Object.assign(new User(), { name: "Grisha" });
        await session.store(user);
        await session.saveChanges();

        const session2 = store.openSession();
        session2.delete(documentId);
        await session2.saveChanges();

        const session3 = store.openSession();
        user = await session3.load<User>(documentId);
        assert.ok(user === null);

        const session4 = store.openSession();
        const person = Object.assign(new Person(), { name: "Grisha" });
        await session4.store(person);
        await session4.saveChanges();
    });
});

    // @Test
    // public void get() throws Exception {
    //     try (IDocumentStore store = getDocumentStore()) {
    //         ObjectNode dummy = JsonExtensions.getDefaultEntityMapper().valueToTree(new User());
    //         dummy.remove("id");

    //         try (IDocumentSession session = store.openSession()) {
    //             User user1 = new User();
    //             user1.setName("Fitzchak");

    //             User user2 = new User();
    //             user2.setName("Arek");

    //             session.store(user1, "users/1");
    //             session.store(user2, "users/2");

    //             session.saveChanges();
    //         }

    //         RequestExecutor requestExecutor = store.getRequestExecutor();

    //         GetDocumentsCommand getDocumentsCommand = new GetDocumentsCommand(new String[]{"users/1", "users/2"}, null, false);

    //         requestExecutor.execute(getDocumentsCommand);

    //         GetDocumentsResult docs = getDocumentsCommand.getResult();
    //         assertThat(docs.getResults().size())
    //                 .isEqualTo(2);

    //         ObjectNode doc1 = (ObjectNode) docs.getResults().get(0);
    //         ObjectNode doc2 = (ObjectNode) docs.getResults().get(1);

    //         assertThat(doc1)
    //                 .isNotNull();

    //         ArrayList<String> doc1Properties = Lists.newArrayList(doc1.fieldNames());
    //         assertThat(doc1Properties)
    //                 .contains("@metadata");

    //         assertThat(doc1Properties.size())
    //                 .isEqualTo(dummy.size() + 1); // +1 for @metadata

    //         assertThat(doc2)
    //                 .isNotNull();

    //         ArrayList<String> doc2Properties = Lists.newArrayList(doc2.fieldNames());
    //         assertThat(doc2Properties)
    //                 .contains("@metadata");

    //         assertThat(doc2Properties.size())
    //                 .isEqualTo(dummy.size() + 1); // +1 for @metadata

    //         try (DocumentSession session = (DocumentSession) store.openSession()) {
    //             User user1 = (User) session.getEntityToJson().convertToEntity(User.class, "users/1", doc1);
    //             User user2 = (User) session.getEntityToJson().convertToEntity(User.class, "users/2", doc2);

    //             assertThat(user1.getName())
    //                     .isEqualTo("Fitzchak");

    //             assertThat(user2.getName())
    //                     .isEqualTo("Arek");
    //         }

    //         getDocumentsCommand = new GetDocumentsCommand(new String[] { "users/1", "users/2"}, null, true);

    //         requestExecutor.execute(getDocumentsCommand);

    //         docs = getDocumentsCommand.getResult();

    //         assertThat(docs.getResults())
    //                 .hasSize(2);

    //         doc1 = (ObjectNode) docs.getResults().get(0);
    //         doc2 = (ObjectNode) docs.getResults().get(1);

    //         assertThat(doc1)
    //                 .isNotNull();

    //         doc1Properties = Lists.newArrayList(doc1.fieldNames());
    //         assertThat(doc1Properties)
    //                 .contains("@metadata");

    //         assertThat(doc1Properties.size())
    //                 .isEqualTo(1);

    //         assertThat(doc2)
    //                 .isNotNull();

    //         doc2Properties = Lists.newArrayList(doc2.fieldNames());
    //         assertThat(doc2Properties)
    //                 .contains("@metadata");

    //         assertThat(doc2Properties.size())
    //                 .isEqualTo(1);

    //     }
    // }