import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    IDocumentStore,
} from "../../src";
import { User } from "../Assets/Entities";

describe("WhatChangedTest", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () => 
        await disposeTestDocumentStore(store));

    it("whatChangedNewField", async () => {
        {
            const newSession = store.openSession();
            const basicName = new BasicName();
            basicName.name = "Toli";
            await newSession.store(basicName, "users/1");

            assert.equal(Object.keys(newSession.advanced.whatChanged()).length, 1);
            await newSession.saveChanges();
        }

        {
            const newSession = store.openSession();

            const user = await newSession.load<User>("users/1");
            user.age = 5;
            const changes = await newSession.advanced.whatChanged();
            assert.equal(changes["users/1"].length, 1);

            assert.equal(changes["users/1"][0].change, "NewField");
            await newSession.saveChanges();
        }

    });

    it("whatChangedRemovedField", async () => {
        {
            const newSession = store.openSession();
            const nameAndAge = new NameAndAge();
            nameAndAge.age = 5;
            nameAndAge.name = "Toli";

            await newSession.store(nameAndAge, "users/1");

            assert.equal(Object.keys(newSession.advanced.whatChanged()).length, 1);
            await newSession.saveChanges();
        }

        {
            const newSession = store.openSession();
            const ageOnly = await newSession.load<BasicAge>("users/1", BasicAge);

            // since in JS we do Object.assign() on an empty object when loading
            // 'name' prop is still there
            // 
            // to actually remove a field we can use delete though 
            delete ageOnly["name"];

            const changes = newSession.advanced.whatChanged();
            assert.equal(changes["users/1"].length, 1);

            assert.equal(changes["users/1"][0].change, "RemovedField");
            await newSession.saveChanges();
        }
    });

    it("whatChangedChangeField", async () => {
        {
            const newSession = store.openSession();
            const basicAge = new BasicAge();
            basicAge.age = 5;
            await newSession.store(basicAge, "users/1");

            assert.equal(Object.keys(newSession.advanced.whatChanged()).length, 1);
            await newSession.saveChanges();
        }

        {
            const newSession = store.openSession();
            const user = await newSession.load<Int>("users/1", Int);

            // JS won't know how to load User into Int class,
            // we can do that manually though
            user.number = user["age"];
            delete user["age"];

            const changes = newSession.advanced.whatChanged();
            assert.equal(changes["users/1"].length, 2);

            assert.equal(changes["users/1"][0].change, "RemovedField");
            assert.equal(changes["users/1"][1].change, "NewField");
            await newSession.saveChanges();
        }
    });

    it("whatChangedArrayValueChanged", async () => {
        {
            const newSession = store.openSession();
            const arr = new Arr();
            arr.array = ["a", 1, "b"];

            await newSession.store(arr, "users/1");
            const changes = newSession.advanced.whatChanged();

            assert.equal(Object.keys(changes).length, 1);

            assert.equal(changes["users/1"].length, 1);
            assert.equal(changes["users/1"][0].change, "DocumentAdded");

            await newSession.saveChanges();
        }

        {
            const newSession = store.openSession();
            const arr = await newSession.load<Arr>("users/1");
            arr.array = [ "a", 2, "c" ];

            const changes = newSession.advanced.whatChanged();
            assert.equal(Object.keys(changes).length, 1);

            assert.equal(changes["users/1"].length, 2);

            assert.equal(changes["users/1"][0].change, "ArrayValueChanged");
            assert.equal(changes["users/1"][0].fieldOldValue.toString(), "1");
            assert.equal(changes["users/1"][0].fieldNewValue, 2);

            assert.equal(changes["users/1"][1].change, "ArrayValueChanged");
            assert.equal(changes["users/1"][1].fieldOldValue, "b");
            assert.equal(changes["users/1"][1].fieldNewValue, "c");
        }
    });

});

// TBD public void What_Changed_Array_Value_Added()
// TBD public void What_Changed_Array_Value_Removed()
// TBD public void RavenDB_8169()

class BasicName {
    public name: string;
}

class NameAndAge {
    public name: string;
    public age: number;
}

class BasicAge {
    public age: number;
}

class Int {
    public number: number;
}

class Double {
    public double: number;
}

class Arr {
    public array: any[];
}
