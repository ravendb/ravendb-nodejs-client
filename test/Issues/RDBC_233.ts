import * as assert from "assert";
import { testContext, disposeTestDocumentStore } from "../Utils/TestUtil";

import DocumentStore, {
    IDocumentStore,
    TypesAwareObjectMapper,
    DocumentConventions,
    PatchOperation,
} from "../../src";
import { PatchRequest } from "../../src/Documents/Operations/PatchRequest";

describe("RDBC-233", function () {

    let mapper: TypesAwareObjectMapper;
    let conventions;

    beforeEach(() => {
        conventions = DocumentConventions.defaultConventions;
        mapper = new TypesAwareObjectMapper({
            documentConventions: conventions
        });
    });

    it("object mapper does not revive types if there's null midway", async () => {
        const obj = {
            date: null,
            anotherOne: {
                start: "2018-01-02",
                end: "2018-01-03"
            }
        };

        const result: any = mapper.fromObjectLiteral(obj, {
            nestedTypes: {
                "date.start": "date",
                "date.end": "date",
                "anotherOne.start": "date",
                "anotherOne.end": "date",
            }
        });

        assert.ok(result);
        assert.strictEqual(result.date, null);
        assert.ok(result.anotherOne.start instanceof Date);
        assert.strictEqual(
            result.anotherOne.start.toString(), 
            DocumentConventions.defaultConventions.dateUtil.parse(obj.anotherOne.start).toString());
        assert.strictEqual(
            result.anotherOne.end.toString(), 
            DocumentConventions.defaultConventions.dateUtil.parse(obj.anotherOne.end).toString());
    });

    describe("entire flow - store, patch, load", async () => {

        let store: IDocumentStore;

        beforeEach(async function () {
            store = await testContext.getDocumentStore();
        });

        afterEach(async () => disposeTestDocumentStore(store));

        it("does not revive types if there's null midway", async () => {
            const docStore = new DocumentStore(store.urls, store.database);
            docStore.conventions.findCollectionNameForObjectLiteral = () => "test";
            docStore.initialize();

            try {
                {
                    const doc = {
                        date: {
                            start: new Date(),
                            end: new Date()
                        }
                    };

                    const session = docStore.openSession();
                    await session.store(doc, "test/1");
                    await session.saveChanges();
                }

                {
                    const patchOp = new PatchOperation(
                        "test/1", null, PatchRequest.forScript("this.date = null;"));
                    await docStore.operations.send(patchOp);
                }

                {
                    const session = docStore.openSession();
                    const doc: any = await session.load("test/1");
                    assert.ok(doc);
                    assert.ok("date" in doc);
                    assert.strictEqual(doc["@metadata"]["@nested-object-types"]["date.start"], "date");
                    assert.strictEqual(doc.date, null);
                }
            } finally {
                docStore.dispose();
            }
        });
    });
});
