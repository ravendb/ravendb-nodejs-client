import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { Company, User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_15080", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canSplitLowerCasedAndUpperCasedCounterNames", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Aviv1";
            await session.store(user, "users/1");

            const countersFor = session.countersFor("users/1");

            for (let i = 0; i < 500; i++) {
                const str = "abc" + i;
                countersFor.increment(str);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const counterFor = session.countersFor("users/1");

            for (let i = 0; i < 500; i++) {
                const str = "Xyz" + i;
                counterFor.increment(str);
            }

            await session.saveChanges();
        }
    });

    it("counterOperationsShouldBeCaseInsensitiveToCounterName", async () => {
        {
            const session = store.openSession();
            const user = new User();
            user.name = "Aviv";
            await session.store(user, "users/1");

            session.countersFor("users/1").increment("abc");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            // should NOT create a new counter
            session.countersFor("users/1").increment("ABc");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            assertThat(await session.countersFor("users/1").getAll())
                .hasSize(1);
        }

        {
            const session = store.openSession();
            // get should be case-insensitive to counter name

            const val = await session.countersFor("users/1").get("AbC");
            assertThat(val)
                .isEqualTo(2);

            const doc = await session.load<User>("users/1", User);
            const countersNames = session.advanced.getCountersFor(doc);
            assertThat(countersNames)
                .hasSize(1);
            assertThat(countersNames[0])
                .isEqualTo("abc"); // metadata counter-names should preserve their original casing
        }

        {
            const session = store.openSession();
            session.countersFor("users/1").increment("XyZ");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const val = await session.countersFor("users/1")
                .get("xyz");
            assertThat(val)
                .isEqualTo(1);

            const doc = await session.load<User>("users/1", User);
            const counterNames = session.advanced.getCountersFor(doc);
            assertThat(counterNames)
                .hasSize(2);

            // metadata counter-names should preserve their original casing
            assertThat(counterNames[0])
                .isEqualTo("abc");
            assertThat(counterNames[1])
                .isEqualTo("XyZ");
        }

        {
            const session = store.openSession();
            // delete should be case-insensitive to counter name
            session.countersFor("users/1").delete("aBC");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const val = await session.countersFor("users/1").get("abc");
            assertThat(val)
                .isNull();

            const doc = await session.load<User>("users/1", User);
            const counterNames = session.advanced.getCountersFor(doc);
            assertThat(counterNames)
                .hasSize(1);

            assertThat(counterNames[0])
                .isEqualTo("XyZ");
        }

        {
            const session = store.openSession();
            session.countersFor("users/1").delete("xyZ");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const val = await session.countersFor("users/1").get("Xyz");
            assertThat(val)
                .isNull();

            const doc = await session.load<User>("users/1", User);
            const counterNames = session.advanced.getCountersFor(doc);
            assertThat(counterNames)
                .isNull();
        }
    });

    it("countersShouldBeCaseInsensitive", async () => {
        // RavenDB-14753

        {
            const session = store.openSession();
            const company = new Company();
            company.name = "HR";

            await session.store(company, "companies/1");
            session.countersFor(company).increment("Likes", 999);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1", Company);
            session.countersFor(company)
                .delete("lIkEs");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1", Company);
            const counters = await session.countersFor(company).getAll();
            assertThat(counters)
                .hasSize(0);
        }
    });

    it("deletedCounterShouldNotBePresentInMetadataCounters", async () => {
        // RavenDB-14753

        {
            const session = store.openSession();

            const company = new Company();
            company.name = "HR";

            await session.store(company, "companies/1");
            session.countersFor(company).increment("Likes", 999);
            session.countersFor(company).increment("Cats", 999);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1", Company);
            session.countersFor(company)
                .delete("lIkEs");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1", Company);
            company.name = "RavenDB";

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1", Company);
            const counters = session.advanced.getCountersFor(company);
            assertThat(counters)
                .hasSize(1);
            assertThat(counters[0])
                .isEqualTo("Cats");
        }
    });

    it("getCountersForDocumentShouldReturnNamesInTheirOriginalCasing", async () => {
        {
            const session = store.openSession();
            await session.store(new User(), "users/1");

            const countersFor = session.countersFor("users/1");

            countersFor.increment("AviV");
            countersFor.increment("Karmel");
            countersFor.increment("PAWEL");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            // GetAll should return counter names in their original casing

            const all = await session.countersFor("users/1").getAll();

            assertThat(all)
                .hasSize(3);

            const keys = Object.keys(all);
            assertThat(keys)
                .contains("AviV")
                .contains("Karmel")
                .contains("PAWEL");
        }
    });

    it("canDeleteAndReInsertCounter", async () => {
        {
            const session = store.openSession();
            const company = new Company();
            company.name = "HR";

            await session.store(company, "companies/1");
            session.countersFor(company).increment("Likes", 999);
            session.countersFor(company).increment("Cats", 999);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1", Company);
            session.countersFor(company)
                .delete("Likes");

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1", Company);
            const counters = session.advanced.getCountersFor(company);

            assertThat(counters)
                .hasSize(1)
                .contains("Cats");

            const counter = await session.countersFor(company)
                .get("Likes");
            assertThat(counter)
                .isNull();

            const all = await session.countersFor(company)
                .getAll();

            assertThat(all)
                .hasSize(1);
        }

        {
            const session = store.openSession();
            session.countersFor("companies/1").increment("Likes");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1", Company);
            const counters = session.advanced.getCountersFor(company);

            assertThat(counters)
                .hasSize(2)
                .contains("Cats")
                .contains("Likes");

            const counter = await session.countersFor(company)
                .get("Likes");
            assertThat(counter)
                .isNotNull();
            assertThat(counter)
                .isEqualTo(1);
        }
    });

    it("countersSessionCacheShouldBeCaseInsensitiveToCounterName", async () => {
        {
            const session = store.openSession();
            const company = new Company();
            company.name = "HR";

            await session.store(company, "companies/1");
            session.countersFor(company)
                .increment("Likes", 333);
            session.countersFor(company)
                .increment("Cats", 999);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const company = await session.load<Company>("companies/1", Company);

            // the document is now tracked by the session,
            // so now counters-cache has access to '@counters' from metadata

            // searching for the counter's name in '@counters' should be done in a case insensitive manner
            // counter name should be found in '@counters' => go to server

            let counter = await session.countersFor(company)
                .get("liKes");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);
            assertThat(counter)
                .isNotNull();
            assertThat(counter)
                .isEqualTo(333);

            counter = await session.countersFor(company).get("cats");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(counter)
                .isNotNull();
            assertThat(counter)
                .isEqualTo(999);

            counter = await session.countersFor(company).get("caTS");
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(counter)
                .isNotNull();
            assertThat(counter)
                .isEqualTo(999);
        }
    })
});