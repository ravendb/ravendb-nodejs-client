import { Company, User } from "../../Assets/Entities";
import { parser } from "stream-json/Parser";
import { testContext, disposeTestDocumentStore } from "../../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../../src";
import { RevisionsCollectionConfiguration } from "../../../src/Documents/Operations/RevisionsCollectionConfiguration";
import { RevisionsConfiguration } from "../../../src/Documents/Operations/RevisionsConfiguration";
import { ConfigureRevisionsOperation } from "../../../src/Documents/Operations/Revisions/ConfigureRevisionsOperation";

describe("RevisionsSubscriptionsTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("plain revisions subscriptions", async () => {
        const subscriptionId = await store.subscriptions.createForRevisions({
            documentType: User
        });

        const defaultCollection = new RevisionsCollectionConfiguration();
        defaultCollection.disabled = false;
        defaultCollection.minimumRevisionsToKeep = 51;

        const usersConfig = new RevisionsCollectionConfiguration();
        usersConfig.disabled = false;

        const donsConfig = new RevisionsCollectionConfiguration();
        donsConfig.disabled = false;

        const configuration = new RevisionsConfiguration();
        configuration.defaultConfig = defaultCollection;

        configuration.collections = new Map<string, RevisionsCollectionConfiguration>();
        configuration.collections.set("Users", usersConfig);
        configuration.collections.set("Dons", donsConfig);

        const operation = new ConfigureRevisionsOperation(configuration);

        await store.maintenance.send(operation);

        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const session = store.openSession();
                const user = new User();
                user.name = "users" + i + " ver " + j;
                await session.store(user, "users/" + i);

                const company = new Company();
                company.name = "dons" + i + " ver " + j;
                await session.store(company, "dons/" + i);

                await session.saveChanges();
            }
        }

        const sub = await store.subscriptions.getSubscriptionWorkerForRevisions<User>({
            documentType: User,
            subscriptionName: subscriptionId
        });

        try {
            await new Promise(resolve => {
                const names = new Set<string>();

                sub.on("batch", (batch, callback) => {
                    batch.items.forEach(item => {
                        const result = item.result;
                        names.add(
                            (result.current ? result.current.name : null)
                            + (result.previous ? result.previous.name : null));

                        if (names.size === 100) {
                            resolve();
                        }
                    });

                    callback();
                });
            });
        } finally {
            sub.dispose();
        }
    });

    it("plain revisions subscriptions compare docs", async () => {
        const subscriptionId = await store.subscriptions.createForRevisions({
            documentType: User
        });

        const defaultCollection = new RevisionsCollectionConfiguration();
        defaultCollection.disabled = false;
        defaultCollection.minimumRevisionsToKeep = 51;

        const usersConfig = new RevisionsCollectionConfiguration();
        usersConfig.disabled = false;

        const donsConfig = new RevisionsCollectionConfiguration();
        donsConfig.disabled = false;

        const configuration = new RevisionsConfiguration();
        configuration.defaultConfig = defaultCollection;

        configuration.collections = new Map<string, RevisionsCollectionConfiguration>();
        configuration.collections.set("Users", usersConfig);
        configuration.collections.set("Dons", donsConfig);

        const operation = new ConfigureRevisionsOperation(configuration);

        await store.maintenance.send(operation);

        for (let j = 0; j < 10; j++) {
            const session = store.openSession();
            const user = new User();
            user.name = "users1 ver " + j;
            user.age = j;
            await session.store(user, "users/1");

            const company = new Company();
            company.name = "dons1 ver " + j;
            await session.store(company, "dons/1");

            await session.saveChanges();
        }

        const sub = await store.subscriptions.getSubscriptionWorkerForRevisions<User>({
            subscriptionName: subscriptionId,
            documentType: User
        });

        try {
            await new Promise(resolve => {
                const names = new Set<string>();

                let maxAge = -1;

                sub.on("batch", (batch, callback) => {
                    batch.items.forEach(item => {
                        const x = item.result;

                        if (x.current.age > maxAge && x.current.age  > (x.previous ? x.previous.age : -1)) {
                            names.add(
                                (x.current ? x.current.name : null)
                                + " " + (x.previous ? x.previous.name : null));
                            maxAge = x.current.age;
                        }

                        if (names.size === 10) {
                            resolve();
                        }
                    });

                    callback();
                });
            });
        } finally {
            sub.dispose();
        }
    });
});
