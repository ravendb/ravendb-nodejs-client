import * as mocha from "mocha";
import * as BluebirdPromise from "bluebird";
import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import {
    RavenErrorType,
    IDocumentStore,
} from "../../src";

describe.only("RavenDB-11649", function () {

    let store: IDocumentStore;

    beforeEach(async function () {
        store = await testContext.getDocumentStore();
    });

    afterEach(async () =>
        await disposeTestDocumentStore(store));

    class OuterClass {
        public innerClassMatrix: InnerClass[][];
        public innerClasses: InnerClass[];
        public a: string;
        public innerClass: InnerClass;
        public middleClass: MiddleClass;
    }

    class InnerClass {
        public a: string;
    }

    class MiddleClass {
        public a: InnerClass;
    }

    it("whatChanged_WhenInnerPropertyChanged_ShouldReturnThePropertyNamePlusPath", async () => {
        
        const session = store.openSession();
        
        // arrange
        const doc = new OuterClass();
        doc.a = "outerValue";
        const innerClass = new InnerClass();
        doc.innerClass = innerClass;
        const id = "docs/1";
        await session.store(doc, id);
        await session.saveChanges();
        doc.innerClass.a = "newInnerValue";

        // action
        const changes = session.advanced.whatChanged();
        
        // assert
        const changedPaths = changes[id]
            .map(x => x.fieldPath);
        assert.ok(changedPaths[0] === "innerClass");
    });

    it("whatChanged_WhenInnerPropertyChangedFromNull_ShouldReturnThePropertyNamePlusPath", async function() {
        const session = store.openSession();

        // arrange
        const doc = new OuterClass();
        doc.a = "outerValue";
        const innerClass = new InnerClass();
        doc.innerClass = innerClass;
        innerClass.a = null;
        const id = "docs/1";
        await session.store(doc, id);
        await session.saveChanges();
        doc.innerClass.a = "newInnerValue";

        // action
        const changes = session.advanced.whatChanged();

        // assert
        const changedPaths = changes[id]
            .map(x => x.fieldPath);
        assert.ok(changedPaths[0] === "innerClass");
    });

    it("whatChanged_WhenPropertyOfInnerPropertyChangedToNull_ShouldReturnThePropertyNamePlusPath", async function() {
        const session = store.openSession();
        // arrange
        const doc = new OuterClass();
        doc.a = "outerValue";
        const innerClass = new InnerClass();
        innerClass.a = "innerValue";
        doc.innerClass = innerClass;
        const id = "docs/1";
        await session.store(doc, id);
        await session.saveChanges();
        doc.innerClass.a = null;

        // action
        const changes = session.advanced.whatChanged();

        // assert
        const changedPaths = changes[id]
            .map(x => x.fieldPath);
        assert.ok(changedPaths[0] === "innerClass");
        assert.strictEqual(changedPaths.length, 1);
    });

    it("whatChanged_WhenOuterPropertyChanged_FieldPathShouldBeEmpty", async function () {
        const session = store.openSession();

        // arrange
        const doc = new OuterClass();
        doc.a = "outerValue";
        const innerClass = new InnerClass();
        innerClass.a = "innerClass";
        doc.innerClass = innerClass;
        const id = "docs/1";
        await session.store(doc, id);
        await session.saveChanges();
        doc.a = "newOuterValue";

        // action
        const changes = session.advanced.whatChanged();

        // assert
        const changedPaths = changes[id]
                .map(x => x.fieldPath);
        assert.ok(changedPaths[0] === "");
        assert.strictEqual(changedPaths.length, 1);
    });

    it("whatChanged_WhenInnerPropertyInArrayChanged_ShouldReturnWithRelevantPath", async function () {
        const session = store.openSession();
        const doc = new OuterClass();
        doc.innerClassMatrix = [[]];
        const id = "docs/1";
        await session.store(doc, id);
        await session.saveChanges();
        doc.innerClassMatrix[0] = [new InnerClass()];

        // action
        const changes = session.advanced.whatChanged();
        // assert
        const changedPaths = changes[id]
                        .map(x => x.fieldPath);
        assert.strictEqual(changedPaths[0], "innerClassMatrix[0]");
        assert.strictEqual(changedPaths.length, 1);

    });

    it("whatChanged_WhenInMatrixChanged_ShouldReturnWithRelevantPath", async function () {
        const session = store.openSession();
        // arrange
        const doc = new OuterClass();
        const innerClass = new InnerClass();
        innerClass.a = "oldValue";
        doc.innerClassMatrix = [[innerClass]];
        const id = "docs/1";
        await session.store(doc, id);
        await session.saveChanges();
        doc.innerClassMatrix[0][0].a = "newValue";

        // action
        const changes = session.advanced.whatChanged();
        const changedPaths = changes[id]
                        .map(x => x.fieldPath);
        assert.strictEqual(changedPaths[0], "innerClassMatrix[0][0]");
        assert.strictEqual(changedPaths.length, 1);
    });

    it("whatChanged_WhenAllNamedAPropertiesChanged_ShouldReturnDifferentPaths", async function () {
        const session = store.openSession();

        // arrange
        const doc = new OuterClass();
        doc.a = "outerValue";
        const innerClass = new InnerClass();
        innerClass.a = "innerValue";
        doc.innerClass = innerClass;
        doc.middleClass = new MiddleClass();
        const innerClass2 = new InnerClass();
        innerClass2.a = "oldValue";
        doc.innerClasses = [ innerClass2 ];
        const innerClass3 = new InnerClass();
        innerClass3.a = "oldValue";
        doc.innerClassMatrix = [[ innerClass3 ]];
        const id = "docs/1";
        await session.store(doc, id);
        await session.saveChanges();
        doc.a = "newOuterValue";
        doc.innerClass.a = "newInnerValue";
        doc.middleClass.a = new InnerClass();
        doc.innerClasses[0].a = "newValue";
        doc.innerClassMatrix[0][0].a = "newValue";

        // action
        const changes = session.advanced.whatChanged();

        // assert
        const changedPaths = changes[id].map(x => x.fieldPath);
        changedPaths.sort();
        const expected = ["", "innerClass", "middleClass", "innerClasses[0]", "innerClassMatrix[0][0]"];
        expected.sort();
        assert.strictEqual(changedPaths.length, expected.length);
        for (let i = 0; i < changedPaths.length; i++) {
            assert.strictEqual(changedPaths[i], expected[i]);
        }
    });

});
