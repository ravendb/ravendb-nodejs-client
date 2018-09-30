import * as assert from "assert";
import { createMetadataDictionary } from "../../src/Mapping/MetadataAsDictionary";

describe("MetadataAsDictionary", function () {

    const source = {
        "Raven-Node-Type": "User",
        "@collection": "Users",
        "@nested-object-types": {
            "people[]": "User",
            "SignedUpAt": "date"
        }
    };
            
    function createMetadata() {
        return createMetadataDictionary({
            raw: source 
        });
    }

    it("can be created", () => {
        createMetadata(); 
    });

    it("when stringified it looks like the source object", () => {
        assert.strictEqual(
            JSON.stringify(source), JSON.stringify(createMetadata()));
    });

    describe("proxy works properly", function () {

        let metadata;

        beforeEach(() => {
            metadata = createMetadata();
        });

        it("gets proper data", function () {
            assert.strictEqual(3, Object.getOwnPropertyNames(metadata).length);
            assert.strictEqual("User", metadata["Raven-Node-Type"]);
            assert.strictEqual("Users", metadata["@collection"]);
        });

        it("gets proper data for nested objects", () => {
            assert.ok(metadata["@nested-object-types"].getParent());
            assert.strictEqual("@nested-object-types", metadata["@nested-object-types"].getParentKey());

            // asserting equality of values here, since we're using proxy
            assert.strictEqual(
                JSON.stringify(metadata), 
                JSON.stringify(metadata["@nested-object-types"].getParent()));
        });

        it("sets data", function () {
            metadata["@collection"] = "Magic";
            assert.strictEqual("Magic", metadata["@collection"]);
        });

        it("updates dirty flag", function () {
            assert.strictEqual(false, metadata.isDirty());
            metadata["@collection"] = "Magic";
            assert.strictEqual(true, metadata.isDirty());
        });

        it("sets data and updates dirty flag for nested objects", function () {
            const nested = metadata["@nested-object-types"];
            assert.strictEqual(false, nested.isDirty());
            nested["SignedUpAt"] = "newtype";
            assert.strictEqual("newtype", metadata["@nested-object-types"]["SignedUpAt"]);
            assert.strictEqual(true, nested.isDirty());
            assert.strictEqual(false, metadata.isDirty());
        });
    });
});
