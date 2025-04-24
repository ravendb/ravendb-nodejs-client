import assert from "node:assert";
import {VectorQuantizer} from "../../../../src/Documents/Queries/VectorSearch/VectorQuantizer.js";

describe("VectorQuantizer", function () {
    describe("toInt8", function () {
        it("should correctly quantize vector elements and store scale factor", function () {
            const input = [0.1, 0.2];
            const result = VectorQuantizer.toInt8(input);

            const expectedResult = [64, 127, -51, -52, 76, 62];

            for (let i = 0; i < expectedResult.length; i++) {
                assert.equal(result[i], expectedResult[i]);
            }
        });

        it("should maintain expected byte values in quantized output", function () {
            const input = [0.1, 0.2];
            const result = VectorQuantizer.toInt8(input);

            const expectedResult = [64, 127, -51, -52, 76, 62];

            for (let i = 0; i < expectedResult.length; i++) {
                assert.equal(result[i], expectedResult[i]);
            }
        });

        it("should handle zero vector input correctly", function () {
            const input = [0, 0, 0, 0];
            const result = VectorQuantizer.toInt8(input);

            const expectedResult = Array(8).fill(0);

            for (let i = 0; i < expectedResult.length; i++) {
                assert.equal(result[i], expectedResult[i]);
            }
        });

        it("should correctly quantize array of floats with positive and negative values", function () {
            const input = [0.5, -1.5, 2.5, -3.5];
            const result = VectorQuantizer.toInt8(input);

            const expectedResult = [18, -54, 91, -127, 0, 0, 96, 64];

            for (let i = 0; i < expectedResult.length; i++) {
                assert.equal(result[i], expectedResult[i]);
            }
        });
    });

    describe("toInt1", function () {
        it("should correctly convert vector to binary bit representation", function () {
            const input = [1.0, -2.0, 3.0, -4.0, 5.0, -6.0, 7.0, -8.0, 9.0];
            const result = VectorQuantizer.toInt1(input);

            const expectedResult = [0xAA, 0x80];

            for (let i = 0; i < expectedResult.length; i++) {
                assert.equal(result[i], expectedResult[i]);
            }
        });

        it("should represent zero values as positive bits", function () {
            const input = [0, 0, 0, 0, 0, 0, 0, 0];
            const result = VectorQuantizer.toInt1(input);

            const expectedResult = [0xFF];

            for (let i = 0; i < expectedResult.length; i++) {
                assert.equal(result[i], expectedResult[i]);
            }
        });

        it("should properly pad vectors with length not divisible by 8", function () {
            const input = [1, 2, 3, 4, 5];
            const result = VectorQuantizer.toInt1(input);

            const expectedResult = [0xF8];

            for (let i = 0; i < expectedResult.length; i++) {
                assert.equal(result[i], expectedResult[i]);
            }
        });

        it("should correctly convert Float32Array with alternating signs", function () {
            const input = [-1, 2, -3, 4, -5, 6, -7, 8];
            const result = VectorQuantizer.toInt1(input);

            const expectedResult = [0x55];

            for (let i = 0; i < expectedResult.length; i++) {
                assert.equal(result[i], expectedResult[i]);
            }
        });
    });
});
