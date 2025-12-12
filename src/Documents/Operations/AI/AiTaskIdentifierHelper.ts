export class AiTaskIdentifierHelper {
    /**
     * Validates an AI task identifier.
     *
     * Rules:
     * - Cannot be empty or contain only whitespace
     * - Must contain only lowercase letters (a-z), digits (0-9), and hyphens (-)
     * - No consecutive hyphens (--)
     * - Cannot end with a hyphen
     * - Must be already normalized (no diacritical marks or non-ASCII characters)
     * - No uppercase letters
     *
     * @param identifier The identifier to validate
     * @returns Array of validation error messages (empty if valid)
     */
    public static validateIdentifier(identifier: string): string[] {
        const errors: string[] = [];

        if (!identifier || identifier.trim().length === 0) {
            errors.push("Identifier cannot be empty or contain only whitespace;");
            return errors;
        }

        // Check that the string is already normalized (contains only a-z, 0-9 and hyphens)
        if (identifier !== identifier.normalize("NFD")) {
            errors.push("Identifier contains diacritical marks or non-ASCII characters;");
        }

        // Check that there are no uppercase letters
        if (/[A-Z]/.test(identifier)) {
            errors.push("Identifier contains uppercase letters;");
        }

        // Check for invalid characters and collect them
        const invalidChars = identifier
            .split('')
            .filter(c => !/[a-z0-9-]/.test(c))
            .filter((value, index, self) => self.indexOf(value) === index); // distinct

        if (invalidChars.length > 0) {
            errors.push(
                `Identifier contains invalid characters: ${invalidChars.map(c => `'${c}'`).join(", ")}. ` +
                `Only lowercase letters (a-z), numbers (0-9) and hyphens (-) are allowed.`
            );
        }

        // Check that there are no consecutive hyphens
        if (identifier.includes("--")) {
            errors.push("Identifier contains consecutive hyphens;");
        }

        // Check that the string does not end with a hyphen
        if (identifier.endsWith("-")) {
            errors.push("Identifier ends with a hyphen;");
        }

        return errors;
    }

    /**
     * Generates a normalized identifier from an input string.
     *
     * Process:
     * - Normalizes the string to FormD (separates diacritics)
     * - Converts uppercase to lowercase
     * - Replaces invalid characters with hyphens
     * - Removes consecutive hyphens
     * - Trims trailing hyphens
     *
     * @param input The input string to generate an identifier from
     * @returns A normalized identifier, or "AiConnectionStringIdentifier" if input is empty
     */
    public static generateIdentifier(input: string): string {
        if (!input || input.trim().length === 0) {
            return "AiConnectionStringIdentifier";
        }

        const result: string[] = [];
        let lastWasHyphen = false;

        const normalized = input.normalize("NFD");

        for (const c of normalized) {
            if (/[a-z0-9]/.test(c)) {
                result.push(c);
                lastWasHyphen = false;
            } else if (/[A-Z]/.test(c)) {
                result.push(c.toLowerCase());
                lastWasHyphen = false;
            } else if (!lastWasHyphen && result.length > 0) {
                result.push('-');
                lastWasHyphen = true;
            }
        }

        let finalResult = result.join('');
        while (finalResult.endsWith('-')) {
            finalResult = finalResult.slice(0, -1);
        }

        return finalResult.length > 0 ? finalResult : "AiConnectionStringIdentifier";
    }
}

