export class VectorQuantizer {
    /**
     * Converts a float array to an int8 array.
     * Finds the maximum absolute value and scales all values to fit in int8 range (-127 to 127).
     * Appends the maximum absolute value as a float at the end.
     *
     * @param rawEmbedding The float array to convert
     * @returns A new array with the quantized values
     */
    public static toInt8(rawEmbedding: number[] | Float32Array): number[] {
        const length = rawEmbedding.length;
        const result = new Int8Array(length + 4); // Extra 4 bytes for the float

        // Find the maximum absolute value
        let maxAbsValue = 0;
        for (let i = 0; i < length; i++) {
            maxAbsValue = Math.max(maxAbsValue, Math.abs(rawEmbedding[i]));
        }

        // Scale factor to fit in int8 range
        const scaleFactor = maxAbsValue === 0 ? 1 : 127 / maxAbsValue;

        // Convert and scale values
        for (let i = 0; i < length; i++) {
            result[i] = Math.round(rawEmbedding[i] * scaleFactor);
        }

        // Append the scale factor as a float32 at the end
        const scaleFactorView = new DataView(result.buffer, length, 4);
        scaleFactorView.setFloat32(0, maxAbsValue, true); // true for little-endian

        return Array.from(result);
    }

    /**
     * Converts a float array to a binary representation where each value is represented by 1 bit.
     * 1 if the value is non-negative, 0 if negative. Packs 8 values per byte.
     *
     * @param rawEmbedding The float array to convert
     * @returns A new array with the binary-packed values
     */
    public static toInt1(rawEmbedding: number[] | Float32Array): number[] {
        const length = rawEmbedding.length;
        const outputLength = Math.ceil(length / 8);
        const result = new Uint8Array(outputLength);

        for (let i = 0; i < length; i++) {
            const byteIndex = Math.floor(i / 8);
            const bitPosition = 7 - (i % 8);

            if (rawEmbedding[i] >= 0) {
                result[byteIndex] |= (1 << bitPosition);
            }
        }

        return Array.from(result);
    }
}
