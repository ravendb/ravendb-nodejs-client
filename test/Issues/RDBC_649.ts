import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import * as assert from "assert";
import {
    IDocumentSession,
    IDocumentStore
} from "../../src";

class User {
    public name: string;
    public age: number;
    public registeredAt: Date;

    constructor(opts: object) {
        opts = opts || {};
        Object.assign(this, opts);
    }
}

describe("RDBC-649", function () {

    let store: IDocumentStore;
    let session: IDocumentSession;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        session = store.openSession();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    describe("default operator for query", function () {

        beforeEach(async () => prepareUserDataSet(store));
        
        it("AND is used when default operator is not set", async () => {
            const queryResults = await session.query({ collection: "users" })
                .whereExists("kids")
                .whereLessThan("age", 29)
                .all();

            assert.strictEqual(queryResults.length, 0);
        });

        it("set default operator to OR", async () => {
            const queryResults = await session.query({ collection: "users" })
                .usingDefaultOperator("OR") // override the default 'AND' operator
                .whereExists("kids")
                .whereLessThan("age", 29)
                .all();

            assert.strictEqual(queryResults.length, 3);
        });
    });
});

async function prepareUserDataSet(store: IDocumentStore) {
    const users = [
        new User({
            name: "John",
            age: 30,
            registeredAt: new Date(2017, 10, 11),
            kids: ["Dmitri", "Mara"]
        }),
        new User({
            name: "Stefanie",
            age: 25,
            registeredAt: new Date(2015, 6, 30)
        }),
        new User({
            name: "Thomas",
            age: 25,
            registeredAt: new Date(2016, 3, 25)
        })
    ];

    const newSession = store.openSession();
    for (const u of users) {
        await newSession.store(u);
    }

    await newSession.saveChanges();
    return users;
}
