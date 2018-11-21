import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    PatchRequest,
    PutAttachmentCommandData,
    DeleteAttachmentCommandData,
    CopyAttachmentCommandData,
    MoveAttachmentCommandData,
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

    it("attachmentPutAndDeleteWillWork", async function () {
        {
            const session = store.openSession();
            const company = Object.assign(new Company(), { name: "HR" });
            const file0Stream = Buffer.from([1, 2, 3]);
            await session.store(company, "companies/1");
            session.advanced.attachments.store(company, "file0", file0Stream);
            await session.saveChanges();
            
            assertThat(session.advanced.attachments.getNames(company))
                .hasSize(1);
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
            assertThat(session.advanced.attachments.getNames(company))
                    .hasSize(1);

            const file1Stream = Buffer.from([1, 2, 3]);
            session.advanced.defer(new PutAttachmentCommandData("companies/1", "file1", file1Stream, null, null));
            await session.saveChanges();

            assertThat(session.advanced.isLoaded("companies/1"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(session.advanced.attachments.getNames(company))
                .hasSize(2);

            session.advanced.defer(new DeleteAttachmentCommandData("companies/1", "file1", null));
            await session.saveChanges();

            assertThat(session.advanced.isLoaded("companies/1"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(session.advanced.attachments.getNames(company))
                .hasSize(1);
        }

    });

    it("attachmentCopyAndMoveWillWork", async function () {
        {
            const session = store.openSession();
            const company1 = Object.assign(new Company(), { name: "HR" });
            const company2 = Object.assign(new Company(), { name: "HR" });
            await session.store(company1, "companies/1");
            await session.store(company2, "companies/2");

            const file1Stream = Buffer.from([1, 2, 3]);
            session.advanced.attachments.store(company1, "file1", file1Stream);
            await session.saveChanges();

            assertThat(session.advanced.attachments.getNames(company1))
                    .hasSize(1);
        }

        {
            const session = store.openSession();
            const company1 = await session.load("companies/1");
            const company2 = await session.load("companies/2");
            assertThat(company1)
                .isNotNull();

            assertThat(session.advanced.isLoaded("companies/1"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(session.advanced.attachments.getNames(company1))
                .hasSize(1);

            assertThat(company2)
                .isNotNull();

            assertThat(session.advanced.isLoaded("companies/2"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(session.advanced.attachments.getNames(company2))
                .hasSize(0);

            session.advanced.defer(
                new CopyAttachmentCommandData("companies/1", "file1", "companies/2", "file1", null));
            await session.saveChanges();

            assertThat(session.advanced.isLoaded("companies/1"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(session.advanced.attachments.getNames(company1))
                .hasSize(1);

            assertThat(session.advanced.isLoaded("companies/2"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(session.advanced.attachments.getNames(company2))
                .hasSize(1);

            session.advanced.defer(
                new MoveAttachmentCommandData("companies/1", "file1", "companies/2", "file2", null));
            await session.saveChanges();

            assertThat(session.advanced.isLoaded("companies/1"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);
            assertThat(session.advanced.attachments.getNames(company1))
                .hasSize(0);

            assertThat(session.advanced.isLoaded("companies/2"))
                .isTrue();
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);
            assertThat(session.advanced.attachments.getNames(company2))
                .hasSize(2);
        }
    });
});
