import * as assert from "assert";
import { createMetadataDictionary, MetadataParameters } from "../../src/Mapping/MetadataAsDictionary";

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
        assert.equal(
            JSON.stringify(source), JSON.stringify(createMetadata()));
    });

    describe("proxy works properly", function () {

        let metadata;

        beforeEach(() => {
            metadata = createMetadata();
        });

        it("gets proper data", function () {
            assert.equal(3, Object.getOwnPropertyNames(metadata).length);
            assert.equal("User", metadata["Raven-Node-Type"]);
            assert.equal("Users", metadata["@collection"]);
        });

        it("gets proper data for nested objects", () => {
            assert.ok(metadata["@nested-object-types"].getParent());
            assert.equal("@nested-object-types", metadata["@nested-object-types"].getParentKey());

            // asserting equality of values here, since we're using proxy
            assert.equal(
                JSON.stringify(metadata), 
                JSON.stringify(metadata["@nested-object-types"].getParent()));
        });

        it("sets data", function () {
            metadata["@collection"] = "Magic";
            assert.equal("Magic", metadata["@collection"]);
        });

        it("updates dirty flag", function () {
            assert.equal(false, metadata.isDirty());
            metadata["@collection"] = "Magic";
            assert.equal(true, metadata.isDirty());
        });

        it("sets data and updates dirty flag for nested objects", function () {
            const nested = metadata["@nested-object-types"];
            assert.equal(false, nested.isDirty());
            nested["SignedUpAt"] = "newtype";
            assert.equal("newtype", metadata["@nested-object-types"]["SignedUpAt"]);
            assert.equal(true, nested.isDirty());
            assert.equal(false, metadata.isDirty());
        });
    });
});
