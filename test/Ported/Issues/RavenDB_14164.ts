import { IDocumentStore } from "../../../src";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import moment = require("moment");
import { User } from "../../Assets/Entities";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_14164Test", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGetTimeSeriesWithIncludeTagDocuments", async () => {
        const tags = ["watches/fitbit", "watches/apple", "watches/sony"];

        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);

            const watch1 = new Watch();
            watch1.name = "FitBit";
            watch1.accuracy = 0.855;

            await session.store(watch1, tags[0]);

            const watch2 = new Watch();
            watch2.name = "Apple";
            watch2.accuracy = 0.9;
            await session.store(watch2, tags[1]);

            const watch3 = new Watch();
            watch3.name = "Sony";
            watch3.accuracy = 0.78;
            await session.store(watch3, tags[2]);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(documentId, "heartRate");

            for (let i = 0; i <= 120; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), i, tags[i % 3]);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.toDate(), baseLine.clone().add(2, "hours").toDate(), b => b.includeTags());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(getResults)
                .hasSize(121);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // should not go to server

            const tagDocuments = await session.load(tags, Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // assert tag documents

            assertThat(tagDocuments)
                .hasSize(3);

            let tagDoc = tagDocuments["watches/fitbit"];
            assertThat(tagDoc.name)
                .isEqualTo("FitBit");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.855);

            tagDoc = tagDocuments["watches/apple"];
            assertThat(tagDoc.name)
                .isEqualTo("Apple");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.9);

            tagDoc = tagDocuments["watches/sony"];
            assertThat(tagDoc.name)
                .isEqualTo("Sony");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.78);
        }
    });

    it("canGetTimeSeriesWithIncludeTagsAndParentDocument", async function () {
        const tags = ["watches/fitbit", "watches/apple", "watches/sony"];

        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "ayende";
            await session.store(user, documentId);

            const watch1 = new Watch();
            watch1.name = "FitBit";
            watch1.accuracy = 0.855;

            await session.store(watch1, tags[0]);

            const watch2 = new Watch();
            watch2.name = "Apple";
            watch2.accuracy = 0.9;
            await session.store(watch2, tags[1]);

            const watch3 = new Watch();
            watch3.name = "Sony";
            watch3.accuracy = 0.78;
            await session.store(watch3, tags[2]);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(documentId, "heartRate");

            for (let i = 0; i <= 120; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), i, tags[i % 3]);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.toDate(), baseLine.clone().add(2, "hours").toDate(), b => b.includeTags().includeDocument());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(getResults)
                .hasSize(121);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // should not go to server

            const user = await session.load(documentId, User);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);
            assertThat(user.name)
                .isEqualTo("ayende");

            // should not go to server

            const tagDocuments = await session.load(tags, Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // assert tag documents

            assertThat(tagDocuments)
                .hasSize(3);

            let tagDoc = tagDocuments["watches/fitbit"];
            assertThat(tagDoc.name)
                .isEqualTo("FitBit");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.855);

            tagDoc = tagDocuments["watches/apple"];
            assertThat(tagDoc.name)
                .isEqualTo("Apple");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.9);

            tagDoc = tagDocuments["watches/sony"];
            assertThat(tagDoc.name)
                .isEqualTo("Sony");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.78);
        }
    });

    it("canGetTimeSeriesWithInclude_CacheNotEmpty", async function() {
        const tags = ["watches/fitbit", "watches/apple", "watches/sony"];

        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);

            const watch1 = new Watch();
            watch1.name = "FitBit";
            watch1.accuracy = 0.855;

            await session.store(watch1, tags[0]);

            const watch2 = new Watch();
            watch2.name = "Apple";
            watch2.accuracy = 0.9;
            await session.store(watch2, tags[1]);

            const watch3 = new Watch();
            watch3.name = "Sony";
            watch3.accuracy = 0.78;
            await session.store(watch3, tags[2]);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(documentId, "heartRate");

            for (let i = 0; i <= 120; i++) {
                let tag: string;
                if (i < 60) {
                    tag = tags[0];
                } else if (i < 90) {
                    tag = tags[1];
                } else {
                    tag = tags[2];
                }
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), i, tag);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            // get [00:00 - 01:00]
            let getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.toDate(), baseLine.clone().add(1, "hours").toDate());
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(getResults)
                .hasSize(61);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "hours").toDate().getTime());

            // get [01:15 - 02:00] with includes
            getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(
                    baseLine.clone().add(75, "minutes").toDate(),
                    baseLine.clone().add(2, "hours").toDate(),
                    i => i.includeTags());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(getResults)
                .hasSize(46);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(75, "minutes").toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // should not go to server
            const tagsDocuments = await session.load([tags[1], tags[2]], Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            // assert tag documents

            assertThat(tagsDocuments)
                .hasSize(2);

            let tagDoc = tagsDocuments["watches/apple"];
            assertThat(tagDoc.name)
                .isEqualTo("Apple");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.9);

            tagDoc = tagsDocuments["watches/sony"];
            assertThat(tagDoc.name)
                .isEqualTo("Sony");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.78);

            // "watches/fitbit" should not be in cache

            const watch = await session.load(tags[0], Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);
            assertThat(watch.name)
                .isEqualTo("FitBit");
            assertThat(watch.accuracy)
                .isEqualTo(0.855);
        }
    });

    it("canGetTimeSeriesWithInclude_CacheNotEmpty2", async function () {
        const tags = ["watches/fitbit", "watches/apple", "watches/sony"];

        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);

            const watch1 = new Watch();
            watch1.name = "FitBit";
            watch1.accuracy = 0.855;

            await session.store(watch1, tags[0]);

            const watch2 = new Watch();
            watch2.name = "Apple";
            watch2.accuracy = 0.9;
            await session.store(watch2, tags[1]);

            const watch3 = new Watch();
            watch3.name = "Sony";
            watch3.accuracy = 0.78;
            await session.store(watch3, tags[2]);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(documentId, "heartRate");

            for (let i = 0; i <= 120; i++) {
                let tag: string;
                if (i < 60) {
                    tag = tags[0];
                } else if (i < 90) {
                    tag = tags[1];
                } else {
                    tag = tags[2];
                }
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), i, tag);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            // get [00:00 - 01:00]
            let getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.toDate(), baseLine.clone().add(1, "hours").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(getResults)
                .hasSize(61);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "hours").toDate().getTime());

            // get [01:30 - 02:00]
            getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.clone().add(90, "minutes").toDate(), baseLine.clone().add(2, "hours").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(getResults)
                .hasSize(31);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(90, "minutes").toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // get [01:00 - 01:15] with includes
            getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(
                    baseLine.clone().add(1, "hour").toDate(),
                    baseLine.clone().add(75, "minutes").toDate(),
                    i => i.includeTags());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(getResults)
                .hasSize(16);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "hours").toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(75, "minutes").toDate().getTime());

            // should not go to server

            let watch = await session.load(tags[1], Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(watch.name)
                .isEqualTo("Apple");

            assertThat(watch.accuracy)
                .isEqualTo(0.9);

            // tags[0] and tags[2] should not be in cache
            watch = await session.load(tags[0], Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            assertThat(watch.name)
                .isEqualTo("FitBit");
            assertThat(watch.accuracy)
                .isEqualTo(0.855);

            watch = await session.load(tags[2], Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(5);
            assertThat(watch.name)
                .isEqualTo("Sony");
            assertThat(watch.accuracy)
                .isEqualTo(0.78);
        }
    });

    it("canGetMultipleRangesWithIncludes", async function () {
        const tags = [ "watches/fitbit", "watches/apple", "watches/sony" ];

        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const session = store.openSession();
            const user = new User();
            user.name = "ayende";
            await session.store(user, documentId);

            const watch1 = new Watch();
            watch1.name = "FitBit";
            watch1.accuracy = 0.855;

            await session.store(watch1, tags[0]);

            const watch2 = new Watch();
            watch2.name = "Apple";
            watch2.accuracy = 0.9;
            await session.store(watch2, tags[1]);

            const watch3 = new Watch();
            watch3.name = "Sony";
            watch3.accuracy = 0.78;
            await session.store(watch3, tags[2]);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(documentId, "heartRate");

            for (let i = 0; i <= 120; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), i, tags[i % 3]);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();

            // get range [00:00 - 00:30]
            let getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.toDate(), baseLine.clone().add(30, "minutes").toDate());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(getResults)
                .hasSize(31);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(30, "minutes").toDate().getTime());

            // get range [00:45 - 00:60]

            getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.clone().add(45, "minutes").toDate(), baseLine.clone().add(1, "hour").toDate());
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(2);

            assertThat(getResults)
                .hasSize(16);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(45, "minutes").toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(1, "hour").toDate().getTime());

            // get range [01:30 - 02:00]
            getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.clone().add(90, "minutes").toDate(), baseLine.clone().add(2, "hour").toDate());
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(3);

            assertThat(getResults)
                .hasSize(31);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(90, "minutes").toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hour").toDate().getTime());

            // get multiple ranges with includes
            // ask for entire range [00:00 - 02:00] with includes
            // this will go to server to get the "missing parts" - [00:30 - 00:45] and [01:00 - 01:30]

            getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(
                    baseLine.toDate(),
                    baseLine.clone().add(2, "hours").toDate(),
                    i => i.includeTags().includeDocument());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);
            assertThat(getResults)
                .hasSize(121);

            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // should not go to server

            const user = await session.load(documentId, User);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);
            assertThat(user.name)
                .isEqualTo("ayende");

            // should not go to server
            const tagDocuments = await session.load(tags, Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(4);

            // assert tag documents
            assertThat(tagDocuments)
                .hasSize(3);

            let tagDoc = tagDocuments["watches/fitbit"];
            assertThat(tagDoc.name)
                .isEqualTo("FitBit");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.855);

            tagDoc = tagDocuments["watches/apple"];
            assertThat(tagDoc.name)
                .isEqualTo("Apple");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.9);

            tagDoc = tagDocuments["watches/sony"];
            assertThat(tagDoc.name)
                .isEqualTo("Sony");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.78);
        }
    });

    it("canGetTimeSeriesWithIncludeTags_WhenNotAllEntriesHaveTags", async function () {
        const tags = ["watches/fitbit", "watches/apple", "watches/sony"];

        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);

            const watch1 = new Watch();
            watch1.name = "FitBit";
            watch1.accuracy = 0.855;

            await session.store(watch1, tags[0]);

            const watch2 = new Watch();
            watch2.name = "Apple";
            watch2.accuracy = 0.9;
            await session.store(watch2, tags[1]);

            const watch3 = new Watch();
            watch3.name = "Sony";
            watch3.accuracy = 0.78;
            await session.store(watch3, tags[2]);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(documentId, "heartRate");

            for (let i = 0; i <= 120; i++) {
                const tag = i % 10 === 0
                    ? null
                    : tags[i % 3];
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), i, tag);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.toDate(), baseLine.clone().add(2, "hours").toDate(), i => i.includeTags());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(getResults)
                .hasSize(121);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // should not go to server

            const tagDocuments = await session.load(tags, Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // assert tag documents

            assertThat(tagDocuments)
                .hasSize(3);


            let tagDoc = tagDocuments["watches/fitbit"];
            assertThat(tagDoc.name)
                .isEqualTo("FitBit");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.855);

            tagDoc = tagDocuments["watches/apple"];
            assertThat(tagDoc.name)
                .isEqualTo("Apple");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.9);

            tagDoc = tagDocuments["watches/sony"];
            assertThat(tagDoc.name)
                .isEqualTo("Sony");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.78);
        }
    });

    it("includesShouldAffectTimeSeriesGetCommandEtag", async function () {
        const tags = ["watches/fitbit", "watches/apple", "watches/sony"];

        const baseLine = moment().startOf("day");

        const documentId = "users/ayende";

        {
            const session = store.openSession();
            await session.store(new User(), documentId);

            const watch1 = new Watch();
            watch1.name = "FitBit";
            watch1.accuracy = 0.855;

            await session.store(watch1, tags[0]);

            const watch2 = new Watch();
            watch2.name = "Apple";
            watch2.accuracy = 0.9;
            await session.store(watch2, tags[1]);

            const watch3 = new Watch();
            watch3.name = "Sony";
            watch3.accuracy = 0.78;
            await session.store(watch3, tags[2]);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const tsf = session.timeSeriesFor(documentId, "heartRate");

            for (let i = 0; i <= 120; i++) {
                tsf.append(baseLine.clone().add(i, "minutes").toDate(), i, tags[i % 3]);
            }

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(baseLine.toDate(), baseLine.clone().add(2, "hours").toDate(), i => i.includeTags());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(getResults)
                .hasSize(121);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // should not go to server
            const tagDocuments = await session.load(tags, Watch);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // assert tag documents

            assertThat(tagDocuments)
                .hasSize(3);

            let tagDoc = tagDocuments["watches/fitbit"];
            assertThat(tagDoc.name)
                .isEqualTo("FitBit");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.855);

            tagDoc = tagDocuments["watches/apple"];
            assertThat(tagDoc.name)
                .isEqualTo("Apple");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.9);

            tagDoc = tagDocuments["watches/sony"];
            assertThat(tagDoc.name)
                .isEqualTo("Sony");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.78);
        }

        {
            const session = store.openSession();

            // update tags[0]

            const watch = await session.load(tags[0], Watch);
            watch.accuracy += 0.05;
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(
                    baseLine.toDate(),
                    baseLine.clone().add(2, "hours").toDate(),
                    b => b.includeTags());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(getResults)
                .hasSize(121);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // should not go to server

            const tagDocuments = await session.load(tags, Watch);

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // assert tag documents

            assertThat(tagDocuments)
                .hasSize(3);

            const tagDoc = tagDocuments["watches/fitbit"];
            assertThat(tagDoc.name)
                .isEqualTo("FitBit");
            assertThat(tagDoc.accuracy)
                .isEqualTo(0.905);
        }

        const newTag = "watches/google";

        {
            const session = store.openSession();
            // add new watch

            const watch = new Watch();
            watch.accuracy = 0.75;
            watch.name = "Google Watch";
            await session.store(watch, newTag);

            // update a time series entry to have the new tag

            session.timeSeriesFor(documentId, "heartRate")
                .append(baseLine.clone().add(45, "minutes").toDate(), 90, newTag);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const getResults = await session.timeSeriesFor(documentId, "heartRate")
                .get(
                    baseLine.toDate(),
                    baseLine.clone().add(2, "hours").toDate(),
                    i => i.includeTags());

            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(getResults)
                .hasSize(121);
            assertThat(getResults[0].timestamp.getTime())
                .isEqualTo(baseLine.toDate().getTime());
            assertThat(getResults[getResults.length - 1].timestamp.getTime())
                .isEqualTo(baseLine.clone().add(2, "hours").toDate().getTime());

            // should not go to server
            await session.load(tags, Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            // assert that newTag is in cache
            const watch = await session.load(newTag, Watch);
            assertThat(session.advanced.numberOfRequests)
                .isEqualTo(1);

            assertThat(watch.name)
                .isEqualTo("Google Watch");
            assertThat(watch.accuracy)
                .isEqualTo(0.75);
        }
    });

});

class Watch {
    public name: string;
    public accuracy: number;
}