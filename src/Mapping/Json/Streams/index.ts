import * as stream from "readable-stream";
import { CONSTANTS } from "../../../Constants";

export { CollectResultStream } from "./CollectResultStream";

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

export const KEY_CASE_TRANSFORM_METADATA_IGNORE_KEYS = (function () {
    const result = Object.assign({}, CONSTANTS.Documents.Metadata);
    delete result["ID_PROPERTY"];
    return Object.keys(result).map(x => result[x]);
})();
