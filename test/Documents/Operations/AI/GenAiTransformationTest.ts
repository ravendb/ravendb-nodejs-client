import assert from "node:assert";
import {GenAiTransformation} from "../../../../src/index.js";

describe("GenAiTransformation", () => {
    describe("validateScript", () => {
        it("should accept valid script with ai.genContext", () => {
            const transformation = new GenAiTransformation();
            transformation.script = `
                loadToGenAi('Products', {
                    Name: this.Name,
                    Category: this.Category
                });
                ai.genContext(ctx);
            `;

            const error = transformation.validateScript();
            assert.strictEqual(error, null);
        });

        it("should accept script with ai.genContext() call", () => {
            const transformation = new GenAiTransformation();
            transformation.script = "ai.genContext({ data: 'test' });";

            const error = transformation.validateScript();
            assert.strictEqual(error, null);
        });

        it("should reject script without ai.genContext", () => {
            const transformation = new GenAiTransformation();
            transformation.script = `
                loadToGenAi('Products', {
                    Name: this.Name
                });
            `;

            const error = transformation.validateScript();
            assert.ok(error !== null);
            assert.ok(error.includes("ai.genContext"));
        });

        it("should reject empty script", () => {
            const transformation = new GenAiTransformation();
            transformation.script = "";

            const error = transformation.validateScript();
            assert.ok(error !== null);
            assert.ok(error.includes("empty"));
        });

        it("should reject null script", () => {
            const transformation = new GenAiTransformation();
            transformation.script = null;

            const error = transformation.validateScript();
            assert.ok(error !== null);
        });

        it("should accept script with ai.genContext as part of larger text", () => {
            const transformation = new GenAiTransformation();
            transformation.script = `
                // First process the document
                var context = {
                    name: this.Name,
                    price: this.Price
                };
                
                // Send to AI with ai.genContext
                ai.genContext(context);
            `;

            const error = transformation.validateScript();
            assert.strictEqual(error, null);
        });
    });
});

