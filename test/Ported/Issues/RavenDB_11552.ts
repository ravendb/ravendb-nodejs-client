import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    PatchRequest,
} from "../../../src";
import { Company } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";
import { DeleteCommandData } from "../../../src/Documents/Commands/CommandData";
import { PatchCommandData } from "../../../src/Documents/Commands/Batches/PatchCommandData";

describe("RavenDB-11552", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("patchWillUpdateTrackedDocumentAfterSaveChanges", async () => {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "HR" }), "companies/1");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1");
            session.advanced.patch(company, "name", "CF");

            const cv = session.advanced.getChangeVectorFor(company);
            const lastModified = session.advanced.getLastModifiedFor(company);

            await session.saveChanges();

            assertThat(company.name)
                .isEqualTo("CF");

            assertThat(session.advanced.getChangeVectorFor(company))
                .isNotEqualTo(cv);
            assertThat(session.advanced.getLastModifiedFor(company))
                .isNotEqualTo(lastModified);

            company.phone = "123";
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1");

            assertThat(company.name)
                .isEqualTo("CF");
            assertThat(company.phone)
                .isEqualTo("123");
        }
    });

    it("deleteWillWork", async function () {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "HR" }), "companies/1");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            let company = await session.load("companies/1");

            assertThat(company)
                .isNotNull();

            assertThat(session.advanced.isLoaded("companies/1"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            session.advanced.defer(new DeleteCommandData("companies/1", null));
            await session.saveChanges();

            assertThat(session.advanced.isLoaded("companies/1"))
                .isFalse();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            company = await session.load("companies/1");
            assertThat(company)
                .isNull();
            assertThat(session.advanced.isLoaded("companies/1"))
                .isFalse();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
        }
    });

    it("patchWillWork", async function () {
        {
            const session = store.openSession();
            await session.store(Object.assign(new Company(), { name: "HR" }), "companies/1");
            await session.saveChanges();
        }
        {
            const session = store.openSession();
            const company = await session.load("companies/1");
            assertThat(company)
                .isNotNull();
            assertThat(session.advanced.isLoaded("companies/1"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            const patchRequest = new PatchRequest();
            patchRequest.script = "this.name = 'HR2';";

            session.advanced.defer(new PatchCommandData("companies/1", null, patchRequest, null));
            await session.saveChanges();

            assertThat(session.advanced.isLoaded("companies/1"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            const company2 = await session.load<Company>("companies/1");
            assertThat(company2)
                .isNotNull();
            assertThat(session.advanced.isLoaded("companies/1"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(company)
                .isSameAs(company2);
            assertThat(company2.name)
                .isEqualTo("HR2");
        }
    });
});

//     @Test
//     public void attachmentPutAndDeleteWillWork() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company = new Company();
//                 company.setName("HR");

//                 ByteArrayInputStream file0Stream = new ByteArrayInputStream(new byte[]{1, 2, 3});
//                 session.store(company, "companies/1");
//                 session.advanced().attachments().store(company, "file0", file0Stream);
//                 session.saveChanges();

//                 assertThat(session.advanced().attachments().getNames(company))
//                         .hasSize(1);
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Company company = session.load(Company.class, "companies/1");

//                 assertThat(company)
//                         .isNotNull();
//                 assertThat(session.advanced().isLoaded("companies/1"))
//                         .isTrue();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(1);
//                 assertThat(session.advanced().attachments().getNames(company))
//                         .hasSize(1);


//                 ByteArrayInputStream file1Stream = new ByteArrayInputStream(new byte[]{1, 2, 3});
//                 session.advanced().defer(new PutAttachmentCommandData("companies/1", "file1", file1Stream, null, null));
//                 session.saveChanges();

//                 assertThat(session.advanced().isLoaded("companies/1"))
//                         .isTrue();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(2);
//                 assertThat(session.advanced().attachments().getNames(company))
//                         .hasSize(2);

//                 session.advanced().defer(new DeleteAttachmentCommandData("companies/1", "file1", null));
//                 session.saveChanges();

//                 assertThat(session.advanced().isLoaded("companies/1"))
//                         .isTrue();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(3);
//                 assertThat(session.advanced().attachments().getNames(company))
//                         .hasSize(1);
//             }
//         }
//     }

//     @Test
//     public void attachmentCopyAndMoveWillWork() throws Exception {
//         try (IDocumentStore store = getDocumentStore()) {
//             try (IDocumentSession session = store.openSession()) {
//                 Company company1 = new Company();
//                 company1.setName("HR");

//                 Company company2 = new Company();
//                 company2.setName("HR");

//                 session.store(company1, "companies/1");
//                 session.store(company2, "companies/2");

//                 ByteArrayInputStream file1Stream = new ByteArrayInputStream(new byte[]{1, 2, 3});
//                 session.advanced().attachments().store(company1, "file1", file1Stream);
//                 session.saveChanges();

//                 assertThat(session.advanced().attachments().getNames(company1))
//                         .hasSize(1);
//             }

//             try (IDocumentSession session = store.openSession()) {
//                 Company company1 = session.load(Company.class, "companies/1");
//                 Company company2 = session.load(Company.class, "companies/2");

//                 assertThat(company1)
//                         .isNotNull();

//                 assertThat(session.advanced().isLoaded("companies/1"))
//                         .isTrue();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(2);
//                 assertThat(session.advanced().attachments().getNames(company1))
//                         .hasSize(1);

//                 assertThat(company2)
//                         .isNotNull();

//                 assertThat(session.advanced().isLoaded("companies/2"))
//                         .isTrue();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(2);
//                 assertThat(session.advanced().attachments().getNames(company2))
//                         .hasSize(0);

//                 session.advanced().defer(new CopyAttachmentCommandData("companies/1", "file1", "companies/2", "file1", null));
//                 session.saveChanges();

//                 assertThat(session.advanced().isLoaded("companies/1"))
//                         .isTrue();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(3);
//                 assertThat(session.advanced().attachments().getNames(company1))
//                         .hasSize(1);

//                 assertThat(session.advanced().isLoaded("companies/2"))
//                         .isTrue();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(3);
//                 assertThat(session.advanced().attachments().getNames(company2))
//                         .hasSize(1);

//                 session.advanced().defer(new MoveAttachmentCommandData("companies/1", "file1", "companies/2", "file2", null));
//                 session.saveChanges();

//                 assertThat(session.advanced().isLoaded("companies/1"))
//                         .isTrue();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(4);
//                 assertThat(session.advanced().attachments().getNames(company1))
//                         .hasSize(0);

//                 assertThat(session.advanced().isLoaded("companies/2"))
//                         .isTrue();
//                 assertThat(session.advanced().getNumberOfRequests())
//                         .isEqualTo(4);
//                 assertThat(session.advanced().attachments().getNames(company2))
//                         .hasSize(2);
//             }
//         }
//     }
// }