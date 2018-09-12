import * as stream from "readable-stream";

export function gatherJsonNotMatchingPath(jsonStream: stream.Stream) {
    return new Promise((resolve, reject) => {
        const rest = {};

        jsonStream.on("error", reject);
        jsonStream.on("end", () => {
            resolve(rest);
        });

        jsonStream.on("header", (data) => {
            Object.assign(rest, data);
        });

        jsonStream.on("footer", (data) => {
            Object.assign(rest, data);
        });
    });
}
