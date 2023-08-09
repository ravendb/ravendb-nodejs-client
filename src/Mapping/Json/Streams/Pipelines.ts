import * as stream from "readable-stream";
import { RavenCommandResponsePipeline } from "../../../Http/RavenCommandResponsePipeline";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { stringer as jsonlStringer } from "stream-json/jsonl/Stringer";
import { stringer } from "stream-json/Stringer";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";
import { ObjectUtil } from "../../../Utility/ObjectUtil";

export function getDocumentResultsAsObjects(
    conventions: DocumentConventions,
    queryStream: boolean
): RavenCommandResponsePipeline<object[]> {
    const pipeline = RavenCommandResponsePipeline.create<object[]>();

    const keysTransform = new stream.Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
            let value = chunk["value"];
            if (!value) {
                return callback();
            }

            if (conventions) {
                value = ObjectUtil.transformDocumentKeys(value, conventions);
            }

            callback(null, {...chunk, value});
        }
    });

    return conventions.useJsonlStreaming
        ? pipeline.parseJsonlAsync(queryStream ? x => x["Item"] : x => x, {
            transforms: [keysTransform]
        })
        : pipeline.parseJsonAsync([
            pick({ filter: "Results" }),
            streamArray(),
            keysTransform
        ]);
}

export function getDocumentStreamResultsIntoStreamPipeline(
    conventions: DocumentConventions
): RavenCommandResponsePipeline<object[]> {
    const pipeline = RavenCommandResponsePipeline.create<object[]>();

    return conventions.useJsonlStreaming
        ? pipeline.parseJsonlAsync(x => x["Item"], {
            transforms: [
                jsonlStringer({ replacer: (key, value) => key === '' ? value.value : value }),
            ]
        })
        : pipeline
            .parseJsonAsync([
                stringer({ useValues: true })
            ]);
}

export async function streamResultsIntoStream(
    bodyStream: stream.Stream,
    conventions: DocumentConventions,
    writable: stream.Writable): Promise<void> {

    return new Promise<void>((resolve, reject) => {
        getDocumentStreamResultsIntoStreamPipeline(conventions)
            .stream(bodyStream, writable, (err) => {
                err ? reject(err) : resolve();
            });
    });
}
