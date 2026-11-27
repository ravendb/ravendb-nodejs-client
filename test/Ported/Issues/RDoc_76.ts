import { IDocumentStore } from "../../../src/index.js";
import { disposeTestDocumentStore, testContext } from "../../Utils/TestUtil.js";
import { assertThat } from "../../Utils/AssertExtensions.js";

class Room {
    public sth: string;
}

class Kitchen extends Room {
}

class Bedroom extends Room {
}

class Guestroom extends Bedroom {
}

class MasterBedroom extends Bedroom {
}

describe("RDoc_76", function () {

    it("register id convention should work properly for derived types async", async () => {
        testContext.customizeStore = async s => {
            s.conventions.registerIdConvention(Bedroom, (dbName, r: Room) => Promise.resolve("b/" + r.sth));
            s.conventions.registerIdConvention(Guestroom, (dbName, r: Room) => Promise.resolve("gr/" + r.sth));
            s.conventions.registerIdConvention(Room, (dbName, r: Room) => Promise.resolve("r/" + r.sth));
            s.conventions.registerIdConvention(Kitchen, (dbName, r: Room) => Promise.resolve("k/" + r.sth));
            s.conventions.registerIdConvention(MasterBedroom, (dbName, r: Room) => Promise.resolve("mb/" + r.sth));
        };
        let store: IDocumentStore;
        try {
            store = await testContext.getDocumentStore();
        } finally {
            testContext.customizeStore = null;
        }
        try {
            {
                const session = store.openSession();
                await session.store(Object.assign(new MasterBedroom(), { sth: "1" }));
                await session.store(Object.assign(new Guestroom(), { sth: "2" }));
                await session.store(Object.assign(new Bedroom(), { sth: "3" }));
                await session.store(Object.assign(new Room(), { sth: "4" }));
                await session.store(Object.assign(new Kitchen(), { sth: "5" }));
                await session.saveChanges();
            }

            const session = store.openSession();
            for (const id of ["mb/1", "gr/2", "b/3", "r/4", "k/5"]) {
                assertThat(await session.load(id)).isNotNull();
            }
        } finally {
            await disposeTestDocumentStore(store);
        }
    });
});
