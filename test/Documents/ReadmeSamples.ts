import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";
import * as util from "util";

import {
    RequestExecutor,
    DocumentConventions,
    RavenErrorType,
    GetNextOperationIdCommand,
    IDocumentStore,
    IDocumentQuery,
    IDocumentSession,
} from "../../src";

//const print = console.log; //(...args) => {};
const print = (...args) => { return; };

describe("Readme query samples", function () {

    let store: IDocumentStore;
    let session: IDocumentSession;

    let data: any[];
    let query: IDocumentQuery<any>;
    let results: any;

    class User {
        public name: string;
        public age: number;
        public registeredAt: Date;

        constructor(opts: any) {
            opts = opts || {};
            Object.assign(this, opts);
        }
    }

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
        session = store.openSession();
        results = null;
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    beforeEach(async function prepareUserDataSet() {
        data = [
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
        for (const u of data) {
            await newSession.store(u);
        }

        await newSession.saveChanges();
    });

    afterEach(async () => {
        print("// RQL");
        print("// " + query.getIndexQuery().query);
        print("// ", query.getIndexQuery().queryParameters);
        results.forEach(x => delete x["@metadata"]);
        print("// " + util.inspect(results));
    });

    it("projections single field", async () => {
        query = session.query({ collection: "users" })
            .selectFields("name");
        results = await query.all();
    });

    it("projections multiple fields", async () => {
        query = session.query({ collection: "users" })
            .selectFields([ "name", "age" ]);
        results = await query.all();
    });

    it ("distinct", async () => {
        query = session.query({ collection: "users" })
        .selectFields("age")
        .distinct();
        results = await query.all();
    });

    it("where equals", async () => {
        query = session.query({ collection: "users" })
            .whereEquals("age", 30);
        results = await query.all();
    });

    it("where in", async () => {
        query = session.query({ collection: "users" })
            .whereIn("name", [ "John", "Thomas" ]);
        results = await query.all();
    });

    it("where between", async () => {
        query = session.query({ collection: "users" })
            .whereBetween("registeredAt", new Date(2016, 0, 1), new Date(2017, 0, 1));
        results = await query.all();
    });

    it("where greater than", async () => {
        query = session.query({ collection: "users" })
            .whereGreaterThan("age", 29);
        results = await query.all();
    });

    it("where exists", async () => {
        query = session.query({ collection: "users" })
            .whereExists("kids");
        results = await query.all();
    });

    it("where contains any", async () => {
        query = session.query({ collection: "users" })
            .containsAny("kids", ["Mara"]);
        results = await query.all();
    });
    
    it("search()", async () => {
        query = session.query({ collection: "users" })
            .search("kids", "Mara John");
        results = await query.all();
    });

    it("subclause", async () => {
        query = session.query({ collection: "users" })
            .whereExists("kids")
            .orElse()
            .openSubclause()
                .whereEquals("age", 25)
                .whereNotEquals("name", "Thomas")
            .closeSubclause();
        results = await query.all();
    });

    it("not()", async () => {
        query = await session.query({ collection: "users" })
            .not()
            .whereEquals("age", 25);
        results = await query.all();
    });

    it("orElse", async () => {
        query = await session.query({ collection: "users" })
            .whereExists("kids")
            .orElse()
            .whereLessThan("age", 30);
        results = await query.all();
    });

    it("orderBy()", async () => {
        query = await session.query({ collection: "users" })
            .orderBy("age");
            
        results = await query.all();
    });

    it("take()", async () => {
        query = await session.query({ collection: "users" })
            .orderBy("age") 
            .take(2);
            
        results = await query.all();
    });

    it("skip()", async () => {
        query = await session.query({ collection: "users" })
            .orderBy("age") 
            .take(1)
            .skip(1);
            
        results = await query.all();
    });

});
