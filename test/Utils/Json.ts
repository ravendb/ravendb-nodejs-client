import * as Parser from "stream-json/Parser";

export function parseJsonVerbose(jsonString: string) {
    if (!jsonString) {
        throw new Error("JSON cannot be empty.");
    }

    try {
        return JSON.parse(jsonString);
    } catch (err) {
        // eslint-disable-next-line no-console
        console.log(`Invalid json: '${jsonString}'`);
        throw err;
    }
}


export async function parseJsonStreamVerbose(jsonString: string) {
    if (!jsonString) {
        throw new Error("JSON cannot be empty.");
    }

    const parser = new Parser({ jsonStreaming: true, streamValues: false });
    parser.push(jsonString);
    parser.push(null);

    return new Promise<any>((resolve) => {
        const items = [];

        parser.on("data", x => {
            items.push(x);
        });

        parser.on("end", () => {
            resolve(items);
        });
    });
}
