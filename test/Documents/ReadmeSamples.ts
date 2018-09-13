import * as stream from "readable-stream";
import * as StreamUtil from "../../src/Utility/StreamUtil";
import * as path from "path";
import * as fs from "fs";
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

// const print = console.log; //(...args) => {};
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

    describe("with data set with includes", function () {

        beforeEach(async function () {
            data = [
                new User({
                    name: "John",
                    age: 30,
                    registeredAt: new Date(2017, 10, 11),
                    kids: ["users/2", "users/3"]
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
            for (let i = 0; i < data.length; i++) {
                await newSession.store(data[i], `users/${i + 1}`);
            }

            await newSession.saveChanges();
        });

        it("loading data with include()", async () => {
            // tslint:disable-next-line:no-shadowed-variable
            const session = store.openSession();
            // users/1
            // {
            //      "name": "John",
            //      "kids": ["users/2", "users/3"]
            // }
            const user1 = await session
                .include("kids")
                .load("users/1");
            // Document users/1 is going to be pulled along 
            // with docs referenced in "kids" field within a single request

            const user2 = await session.load("users/2"); // this won't call server again
            assert.ok(user1);
            assert.ok(user2);
            assert.equal(session.advanced.numberOfRequests, 1);
        });

    });

    it("store attachment", async () => {
        const doc = new User({
            name: "John"
        });

        // track entity
        await session.store(doc);

        // open and store attachment
        const fileStream = fs.createReadStream(path.join(__dirname, "../Assets/tubes.png"));
        session.advanced.attachments.store(doc, "tubes.png", fileStream, "image/png");
        
        await session.saveChanges();
    });

    describe("having attachment", () => {

        let doc;

        beforeEach(async () => {

            doc = new User({
                name: "John"
            });

            // track entity
            await session.store(doc);

            // open and store attachment
            const fileStream = fs.createReadStream(path.join(__dirname, "../Assets/tubes.png"));
            session.advanced.attachments.store(doc, "tubes.png", fileStream, "image/png");

            await session.saveChanges();
            fileStream.close();
        });

        it("get attachment", (done) => {
            session.advanced.attachments.get(doc.id, "tubes.png")
                .then(attachment => {
                    print(attachment.details);

                    // attachment.data is a Readable
                    attachment.data
                        .pipe(fs.createWriteStream(".test/tubes.png"))
                        .on("finish", () => {
                            attachment.dispose();
                            done();
                        });
                });
        });

        it("attachment exists", async () => {
            print(await session.advanced.attachments.exists(doc.id, "tubes.png"));
            print(await session.advanced.attachments.exists(doc.id, "x.png"));
        });

        it("get attachments names", async () => {
            await session.advanced.refresh(doc);
            print(await session.advanced.attachments.getNames(doc));
        });

    });

    describe("with user data set", function () {

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
                .selectFields(["name", "age"]);
            results = await query.all();
        });

        it("distinct", async () => {
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
                .whereIn("name", ["John", "Thomas"]);
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

});
