import * as assert from "assert";
import { IDocumentStore, InMemoryDocumentSessionOperations } from "../../src";
import { disposeTestDocumentStore, testContext } from "../Utils/TestUtil";
import { DateUtil } from "../../src/Utility/DateUtil";

describe("FirstClassPatchTest", function () {

    const _docId = "users/1-A";

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    it("can patch", async () => {
        const stuff = [new Stuff(), undefined, undefined];
        stuff[0].key = 6;

        const user = new User();
        user.numbers = [66];
        user.stuff = stuff;

        {
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load(user["id"]);
            assert.strictEqual(loaded["stuff"].length, 3);
            assert.strictEqual(loaded["stuff"][0].key, 6);
            assert.strictEqual(loaded["stuff"][1], null);
        }

        const now = new Date();

        {
            const session = store.openSession();
            session.advanced.patch(_docId, "numbers[0]", 31);
            session.advanced.patch(_docId, "lastLogin", now);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId, User);
            assert.strictEqual(loaded.numbers[0], 31);
            assert.strictEqual(loaded.lastLogin, DateUtil.stringify(now));

            session.advanced.patch(loaded, "stuff[0].phone", "123456");
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId, User);
            assert.strictEqual(loaded.stuff[0].phone, "123456");
        }
    });

    it("can patch and modify", async () => {
        const user = new User();
        user.numbers = [66];

        {
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId, User);
            loaded.numbers[0] = 1;
            session.advanced.patch(loaded, "numbers[0]", 2);

            try {
                await session.saveChanges();
                assert.fail("it should have thrown");
            } catch (err) {
                assert.strictEqual(err.message, 
                    // tslint:disable-next-line:max-line-length
                    "Cannot perform save because document users/1-A has been modified by the session and is also taking part in deferred PATCH command");
                assert.strictEqual(err.name, "InvalidOperationException");
            }
        }
    });

    it("can patch complex", async () => {
        const stuff = [undefined, undefined, undefined] as Stuff[];
        stuff[0] = new Stuff();
        stuff[0].key = 6;

        const user = new User();
        user.stuff = stuff;

        {
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const newStuff = new Stuff();
            newStuff.key = 4;
            newStuff.phone = "9255864406";
            newStuff.friend = new Friend();
            session.advanced.patch(_docId, "stuff[1]", newStuff);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId);

            assert.strictEqual(loaded.stuff[1].phone, "9255864406");
            assert.strictEqual(loaded.stuff[1].key, 4);
            assert.ok(loaded.stuff[1].friend);

            const pet1 = new Pet();
            pet1.kind = "Dog";
            pet1.name = "Hanan";

            const friendsPet = new Pet();
            friendsPet.name = "Miriam";
            friendsPet.kind = "Cat";

            const friend = new Friend();
            friend.name = "Gonras";
            friend.age = 28;
            friend.pet = friendsPet;

            const secondStaff = new Stuff();
            secondStaff.key = 4;
            secondStaff.phone = "9255864406";
            secondStaff.pet = pet1;
            secondStaff.friend = friend;

            secondStaff.dic = { Ohio: "Columbus", Utah: "Salt Lake City", Texas: "Austin", California: "Sacramento" };

            session.advanced.patch(loaded, "stuff[2]", secondStaff);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId);

            assert.strictEqual(loaded.stuff[2].pet.name, "Hanan");
            assert.strictEqual(loaded.stuff[2].friend.name, "Gonras");
            assert.strictEqual(loaded.stuff[2].friend.pet.name, "Miriam");
            assert.strictEqual(Object.keys(loaded.stuff[2].dic).length, 4);
            assert.strictEqual(loaded.stuff[2].dic["Utah"], "Salt Lake City");
        }
    });

    it("can add to array", async () => {
        const stuff = [undefined] as Stuff[];

        stuff[0] = new Stuff();
        stuff[0].key = 6;

        const user = new User();
        user.stuff = stuff;
        user.numbers = [1, 2];

        {
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            // push
            session.advanced.patch(_docId, "numbers", roles => roles.push(3));
            session.advanced.patch(_docId, "stuff", roles => {
                const stuff1 = new Stuff();
                stuff1.key = 75;
                roles.push(stuff1);
            });
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId);

            assert.strictEqual(loaded.numbers[2], 3);
            assert.strictEqual(loaded.stuff[1].key, 75);

            session.advanced.patch(loaded, "numbers", roles => roles.push(101, 102, 103));
            session.advanced.patch(loaded, "stuff", roles => {
                const s1 = new Stuff();
                s1.key = 102;

                const s2 = new Stuff();
                s2.phone = "123456";

                roles.push(s1).push(s2);
            });

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId);
            assert.strictEqual(loaded.numbers.length, 6);
            assert.strictEqual(loaded.numbers[5], 103);

            assert.strictEqual(loaded.stuff[2].key, 102);
            assert.strictEqual(loaded.stuff[3].phone, "123456");

            session.advanced.patch(loaded, "numbers", roles => roles.push(201, 202, 203));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId);
            assert.strictEqual(loaded.numbers.length, 9);
            assert.strictEqual(loaded.numbers[7], 202);
        }
    });

    it("can remove from array", async () => {
        const stuff = [undefined, undefined] as Stuff[];
        stuff[0] = new Stuff();
        stuff[0].key = 6;

        stuff[1] = new Stuff();
        stuff[1].phone = "123456";

        const user = new User();
        user.stuff = stuff;
        user.numbers = [1, 2, 3];

        {
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.patch(_docId, "numbers", roles => roles.removeAt(1));
            session.advanced.patch(_docId, "stuff", roles => roles.removeAt(0));
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId);
            assert.strictEqual(loaded.numbers.length, 2);
            assert.strictEqual(loaded.numbers[1], 3);

            assert.strictEqual(loaded.stuff.length, 1);
            assert.strictEqual(loaded.stuff[0].phone, "123456");
        }
    });

    it("can increment", async () => {
        const s = [undefined, undefined, undefined] as Stuff[];
        s[0] = new Stuff();
        s[0].key = 6;

        const user = new User();
        user.numbers = [66];
        user.stuff = s;

        {
            const session = store.openSession();
            await session.store(user);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.increment(_docId, "numbers[0]", 1);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId);
            assert.strictEqual(loaded.numbers[0], 67);

            session.advanced.increment(loaded, "stuff[0].key", -3);
            await session.saveChanges();
        }

        {
            const session = store.openSession();
            const loaded = await session.load<User>(_docId);
            assert.strictEqual(loaded.stuff[0].key, 3);
        }
    });

    it("should merge patch calls", async () => {
        const stuff = [undefined, undefined, undefined] as Stuff[];
        stuff[0] = new Stuff();
        stuff[0].key = 6;

        const user = new User();
        user.stuff = stuff;
        user.numbers = [66];

        const user2 = new User();
        user2.numbers = [1, 2, 3];
        user2.stuff = stuff;

        const docId2 = "users/2-A";

        {
            const session = store.openSession();
            await session.store(user);
            await session.store(user2, docId2);
            await session.saveChanges();
        }

        const now = new Date();

        {
            const session = store.openSession();
            session.advanced.patch(_docId, "numbers[0]", 31);
            assert.strictEqual((session as any as InMemoryDocumentSessionOperations).deferredCommandsCount, 1);

            session.advanced.patch(_docId, "lastLogin", now);
            assert.strictEqual((session as any as InMemoryDocumentSessionOperations).deferredCommandsCount, 1);

            session.advanced.patch(docId2, "numbers[0]", 123);
            assert.strictEqual((session as any as InMemoryDocumentSessionOperations).deferredCommandsCount, 2);

            session.advanced.patch(docId2, "lastLogin", now);
            assert.strictEqual((session as any as InMemoryDocumentSessionOperations).deferredCommandsCount, 2);

            await session.saveChanges();
        }

        {
            const session = store.openSession();
            session.advanced.increment(_docId, "numbers[0]", 1);
            assert.strictEqual((session as any as InMemoryDocumentSessionOperations).deferredCommandsCount, 1);

            session.advanced.patch(_docId, "numbers", r => r.push(77));
            assert.strictEqual((session as any as InMemoryDocumentSessionOperations).deferredCommandsCount, 1);

            session.advanced.patch(_docId, "numbers", r => r.push(88));
            assert.strictEqual((session as any as InMemoryDocumentSessionOperations).deferredCommandsCount, 1);

            session.advanced.patch(_docId, "numbers", r => r.removeAt(1));
            assert.strictEqual((session as any as InMemoryDocumentSessionOperations).deferredCommandsCount, 1);

            await session.saveChanges();
        }
    });
});

export class User {
    public stuff: Stuff[];
    public lastLogin: Date;
    public numbers: number[];
}

export class Stuff {
    public key: number;
    public phone: string;
    public pet: Pet;
    public friend: Friend;
    public dic: { [key: string]: any };
}

export class Friend {
    public name: string;
    public age: number;
    public pet: Pet;
}

export class Pet {
    public name: string;
    public kind: string;
}
