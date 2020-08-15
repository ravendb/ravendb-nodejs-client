import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
    GetStatisticsOperation,
} from "../../../src";
import { Company } from "../../Assets/Entities";
import { assertThat, assertThrows } from "../../Utils/AssertExtensions";

describe("RavenDB-11058", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canCopyAttachment", async () => {
        {
            const session = store.openSession();
            const company = Object.assign(new Company(), { name: "HR" });
            await session.store(company, "companies/1");
            session.advanced.attachments.store(company, "file1", Buffer.from([1, 2, 3]));
            session.advanced.attachments.store(company, "file10", Buffer.from([3, 2, 1]));

            await session.saveChanges();
        }

        let stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(2);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(2);

        {
            const session = store.openSession();
            const newCompany = Object.assign(new Company(), { name: "CF" });
            await session.store(newCompany, "companies/2");

            const oldCompany = await session.load("companies/1");
            session.advanced.attachments.copy(oldCompany, "file1", newCompany, "file2");
            await session.saveChanges();
        }

        stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(3);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(2);

        {
            const session = store.openSession();
            assertThat(await session.advanced.attachments.exists("companies/1", "file1"))
                .isTrue();
            assertThat(await session.advanced.attachments.exists("companies/1", "file2"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file10"))
                .isTrue();

            assertThat(await session.advanced.attachments.exists("companies/2", "file1"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/2", "file2"))
                .isTrue();
            assertThat(await session.advanced.attachments.exists("companies/2", "file10"))
                .isFalse();
        }

        {
            const session = store.openSession();
            session.advanced.attachments.copy("companies/1", "file1", "companies/2", "file3");
            await session.saveChanges();
        }

        stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(4);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(2);

        {
            const session = store.openSession();
            assertThat(await session.advanced.attachments.exists("companies/1", "file1"))
                .isTrue();
            assertThat(await session.advanced.attachments.exists("companies/1", "file2"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file3"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file10"))
                .isTrue();

            assertThat(await session.advanced.attachments.exists("companies/2", "file1"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/2", "file2"))
                .isTrue();
            assertThat(await session.advanced.attachments.exists("companies/2", "file3"))
                .isTrue();
            assertThat(await session.advanced.attachments.exists("companies/2", "file10"))
                .isFalse();
        }

        {
            const session = store.openSession();
            session.advanced.attachments.copy("companies/1", "file1", "companies/2", "file3"); //should throw
            await assertThrows(
                async () => session.saveChanges(),
                e => assert.strictEqual(e.name, "ConcurrencyException"));
        }
    });

    it("canMoveAttachment", async function () {
        {
            const session = store.openSession();
            const company = Object.assign(new Company(), { name: "HR" });
            await session.store(company, "companies/1");
            session.advanced.attachments
                .store(company, "file1", Buffer.from([1, 2, 3]));
            session.advanced.attachments
                .store(company, "file10", Buffer.from([3, 2, 1]));
            session.advanced.attachments
                .store(company, "file20", Buffer.from([4, 5, 6]));

            await session.saveChanges();
        }

        let stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(3);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(3);

        {
            const session = store.openSession();
            const newCompany = Object.assign(new Company(), { name: "CF" });
            await session.store(newCompany, "companies/2");

            const oldCompany = await session.load("companies/1");
            session.advanced.attachments.move(oldCompany, "file1", newCompany, "file2");
            await session.saveChanges();
        }

        stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(3);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(3);

        {
            const session = store.openSession();
            assertThat(await session.advanced.attachments.exists("companies/1", "file1"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file2"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file10"))
                .isTrue();
            assertThat(await session.advanced.attachments.exists("companies/1", "file20"))
                .isTrue();

            assertThat(await session.advanced.attachments.exists("companies/2", "file1"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/2", "file2"))
                .isTrue();
            assertThat(await session.advanced.attachments.exists("companies/2", "file10"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/2", "file20"))
                .isFalse();
        }

        {
            const session = store.openSession();
            session.advanced.attachments.move(
                "companies/1", "file10", "companies/2", "file3"); //should throw
            await session.saveChanges();
        }

        stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(3);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(3);

        {
            const session = store.openSession();
            assertThat(await session.advanced.attachments.exists("companies/1", "file1"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file2"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file3"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file10"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file20"))
                .isTrue();

            assertThat(await session.advanced.attachments.exists("companies/2", "file1"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/2", "file2"))
                .isTrue();
            assertThat(await session.advanced.attachments.exists("companies/2", "file3"))
                .isTrue();
            assertThat(await session.advanced.attachments.exists("companies/2", "file10"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/2", "file20"))
                .isFalse();
        }

        {
            const session = store.openSession();
            session.advanced.attachments.move(
                "companies/1", "file20", "companies/2", "file3"); //should throw

            await assertThrows(
                async () => await session.saveChanges(),
                e => assert.strictEqual(e.name, "ConcurrencyException", e.toString()));
        }
    });

    it("canRenameAttachment", async function () {
        {
            const session = store.openSession();
            const company = Object.assign(new Company(), { name: "HR" });
            await session.store(company, "companies/1");
            session.advanced.attachments.store(company, "file1", Buffer.from([1, 2, 3]));
            session.advanced.attachments.store(company, "file10", Buffer.from([3, 2, 1]));
            await session.saveChanges();
        }

        let stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(2);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(2);

        {
            const session = store.openSession();
            const company = await session.load("companies/1");
            session.advanced.attachments.rename(company, "file1", "file2");
            await session.saveChanges();
        }

        stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(2);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(2);

        {
            const session = store.openSession();
            assertThat(await session.advanced.attachments.exists("companies/1", "file1"))
                .isFalse();
            assertThat(await session.advanced.attachments.exists("companies/1", "file2"))
                .isTrue();
        }

        {
            const session = store.openSession();
            const company = await session.load("companies/1");
            session.advanced.attachments.rename(company, "file2", "file3");
            await session.saveChanges();
        }

        stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(2);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(2);

        {
            const session = store.openSession();
            const company = await session.load("companies/1");
            session.advanced.attachments.rename(company, "file3", "file10"); // should throw
            await assertThrows(
                async () => session.saveChanges(),
                err => assert.strictEqual(err.name, "ConcurrencyException"));
        }

        stats = await store.maintenance.send(new GetStatisticsOperation());
        assertThat(stats.countOfAttachments)
            .isEqualTo(2);
        assertThat(stats.countOfUniqueAttachments)
            .isEqualTo(2);

    });
});
