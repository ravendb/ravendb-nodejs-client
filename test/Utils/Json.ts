export function parseJsonVerbose(jsonString: string) {
    if (!jsonString) {
        throw new Error("JSON cannot be empty.");
    }

    try {
        return JSON.parse(jsonString);
    } catch (err) {
        // tslint:disable-next-line:no-console
        console.log(`Invalid json: '${jsonString}'`);
        throw err;
    }
}
