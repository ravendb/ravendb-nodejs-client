import { IDocumentStore } from "../../../src/Documents/IDocumentStore";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil";
import { assertThat } from "../../Utils/AssertExtensions";
import moment = require("moment");
import { DateUtil } from "../../../src/Utility/DateUtil";

describe("ClientGraphQueriesTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("canGraphQuery", async () => {
        {
            const session = store.openSession();

            const bar = Object.assign(new Bar(), {
                name: "Barvazon"
            });

            const barId = "Bars/1";

            await session.store(bar, barId);

            const foo = Object.assign(new Foo(), {
                name: "Foozy",
                bars: [ barId ]
            } as Partial<Foo>);

            await session.store(foo);

            await session.saveChanges();

            const res = await session.advanced
                .graphQuery("match (Foos as foo)-[bars as _]->(Bars as bar)", FooBar)
                .withQuery("foo", session.query(Foo))
                .single();

            assertThat(res.foo.name)
                .isEqualTo("Foozy");

            assertThat(res.bar.name)
                .isEqualTo("Barvazon");
        }
    });

    it("canAggregateQueryParametersProperly", async () => {
        {
            const session = store.openSession();

            const bar = Object.assign(new Bar(), {
                name: "Barvazon",
                age: 19
            });

            const barId = "Bars/1";

            await session.store(bar, barId);

            const foo = Object.assign(new Foo(), {
                name: "Foozy",
                bars: [ barId ]
            });

            await session.store(foo);

            await session.saveChanges();

            const namesList = [
                [ "Fi", "Fah", "Foozy" ],
                [ "Fi", "Foozy", "Fah" ],
                [ "Foozy", "Fi", "Fah", "Foozy" ],
                [ "Fi", "Foozy", "Fah", "Fah", "Foozy" ]
            ];

            for (const names of namesList) {
                const res = await session.advanced.graphQuery("match (Foos as foo)-[bars as _]->(Bars as bar)", FooBar)
                    .withQuery("foo", b => b.query(Foo).whereIn("name", names))
                    .withQuery("bar", session.query(Bar).whereGreaterThanOrEqual("age", 18))
                    .waitForNonStaleResults()
                    .all();

                assertThat(res)
                    .hasSize(1);

                assertThat(res[0].foo.name)
                    .isEqualTo("Foozy");
                assertThat(res[0].bar.name)
                    .isEqualTo("Barvazon");
            }
        }
    });

    it("waitForNonStaleResultsOnGraphQueriesWithClauseShouldWork", async () => {
        const names = [ "Fi", "Fah", "Foozy" ];

        {
            const session = store.openSession();
            const query = session
                .advanced
                .graphQuery("match (Foos as foo)-[bars as _]->(Bars as bar)", FooBar)
                .withQuery("foo", b => b.query(Foo).whereIn("name", names).waitForNonStaleResults(3_000))
                .withQuery("bar", session.query(Bar).waitForNonStaleResults(5_000).whereGreaterThanOrEqual("age", 18))
                .waitForNonStaleResults()
                .getIndexQuery();

            assertThat(query.waitForNonStaleResults)
                .isTrue();
            assertThat(query.waitForNonStaleResultsTimeout)
                .isEqualTo(5_000);
        }
    });

    it("canUseWithEdges", async () => {
        {
            const session = store.openSession();
            const now = new Date();

            const friend1 = Object.assign(new Friend(), {
                name: "F1",
                age: 21,
                friends: [
                    new FriendDescriptor(moment(now).add(-1024, "days").toDate(), "Friend/2"),
                    new FriendDescriptor(moment(now).add(-678, "days").toDate(), "Friend/3"),
                    new FriendDescriptor(moment(now).add(-345, "days").toDate(), "Friend/4"),
                ]
            });

            await session.store(friend1, "Friend/1");

            const friend2 = Object.assign(new Friend(), {
                name: "F2",
                age: 19,
                friends: [
                    new FriendDescriptor(moment(now).add(-1024, "days").toDate(), "Friend/1"),
                    new FriendDescriptor(moment(now).add(-304, "days").toDate(), "Friend/4"),
                ]
            });

            await session.store(friend2, "Friend/2");

            const friend3 = Object.assign(new Friend(), {
                name: "F3",
                age: 41,
                friends: [
                    new FriendDescriptor(moment(now).add(-678, "days").toDate(), "Friend/1"),
                ]
            });

            await session.store(friend3, "Friend/3");

            const friend4 = Object.assign(new Friend(), {
                name: "F4",
                age: 32,
                friends: [
                    new FriendDescriptor(moment(now).add(-304, "days").toDate(), "Friend/2"),
                    new FriendDescriptor(moment(now).add(-345, "days").toDate(), "Friend/1")
                ]
            });

            await session.store(friend4, "Friend/4");

            const from = moment(now).add(-345, "days").toDate();

            await session.saveChanges();


            const tupleResult = await session.advanced.graphQuery("match (f1)-[l1]->(f2)", FriendsTuple)
                .withQuery("f1", session.query(Friend))
                .withQuery("f2", session.query(Friend))
                .withEdges("l1", "friends", "where friendsSince >= '" + DateUtil.utc.stringify(from) + "' select friendId")
                .waitForNonStaleResults()
                .all();

            const res = tupleResult
                .sort((a, b) => b.f1.age - a.f1.age)
                .map(x => x.f1);

            assertThat(res)
                .hasSize(4);

            assertThat(res[0].name)
                .isEqualTo("F4");
            assertThat(res[1].name)
                .isEqualTo("F4");
            assertThat(res[2].name)
                .isEqualTo("F1");
            assertThat(res[3].name)
                .isEqualTo("F2");
        }
    });
});

class FriendsTuple {
    public f1: Friend;
    public l1: FriendDescriptor;
    public f2: Friend;
}

class Friend {
    public name: string;
    public age: number;
    public friends: FriendDescriptor[];
}

class FooBar {
    public foo: Foo;
    public bar: Bar;
}

class Foo {
    public name: string;
    public bars: string[];
}

class Bar {
    public name: string;
    public age: number;
}

class FriendDescriptor {
    public friendsSince: Date;
    public friendId: string;

    public constructor();
    public constructor(friendsSince: Date, friendId: string)
    public constructor(friendsSince?: Date, friendId?: string) {
        this.friendsSince = friendsSince;
        this.friendId = friendId;
    }
}