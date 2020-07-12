import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { User } from "../../Assets/Entities";
import { RevisionsConfiguration } from "../../../src/Documents/Operations/RevisionsConfiguration";
import { RevisionsCollectionConfiguration } from "../../../src/Documents/Operations/RevisionsCollectionConfiguration";
import { ConfigureRevisionsOperation } from "../../../src/Documents/Operations/Revisions/ConfigureRevisionsOperation";
import { assertThat } from "../../Utils/AssertExtensions";

describe("RavenDB_13762", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("sessionInSubscriptionsShouldNotTrackRevisions", async () => {
        const subscriptionId = await store.subscriptions.createForRevisions({
            documentType: User
        });

        const defaultConfiguration = Object.assign(new RevisionsCollectionConfiguration(), {
            disabled: false,
            minimumRevisionsToKeep: 5
        } as Partial<RevisionsCollectionConfiguration>);

        const userConfiguration = Object.assign(new RevisionsCollectionConfiguration(), {
            disabled: false
        } as Partial<RevisionsCollectionConfiguration>);

        const configuration = Object.assign(new RevisionsConfiguration(), {
            defaultConfig: defaultConfiguration,
            collections: new Map(Object.entries({
                Users: userConfiguration
            }))
        } as Partial<RevisionsConfiguration>);

        const operation = new ConfigureRevisionsOperation(configuration);
        await store.maintenance.send(operation);

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const session = store.openSession();

                const user = Object.assign(new User(), {
                    name: "users" + i + " ver " + j
                });
                await session.store(user, "users/" + i);
                await session.saveChanges();
            }
        }

        const sub = store.subscriptions.getSubscriptionWorkerForRevisions<User>({
            documentType: User,
            subscriptionName: subscriptionId
        });

        let exception: Error;

        const donePromise = new Promise(resolve => {
            sub.on("batch", async (x, callback) => {
                try {
                    const session = x.openSession();
                    x.items[0].result.current.name = "aaaa";

                    await session.saveChanges();
                } catch (err) {
                    exception = err;
                } finally {
                    callback();
                    resolve();
                }
            });
        })

        const errPromise = new Promise((_, reject) => {
            sub.on("error", err => {
                reject(err);
            });
        });

        await Promise.race([errPromise, donePromise]);

        assertThat(exception)
            .isNull();
    });
});
