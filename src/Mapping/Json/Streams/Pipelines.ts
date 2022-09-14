import * as stream from "readable-stream";
import { RavenCommandResponsePipeline } from "../../../Http/RavenCommandResponsePipeline";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { stringer as jsonlStringer } from "stream-json/jsonl/Stringer";
import { stringer } from "stream-json/Stringer";
import { TransformKeysJsonStream } from "./TransformKeysJsonStream";
import { getTransformJsonKeysProfile } from "./TransformJsonKeysProfiles";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";
import { streamValues } from "stream-json/streamers/StreamValues";
import { ignore } from "stream-json/filters/Ignore";

export function getDocumentResultsAsObjects(
    conventions: DocumentConventions
): RavenCommandResponsePipeline<object[]> {
    const pipeline = RavenCommandResponsePipeline.create<object[]>();

    return conventions.useJsonlStreaming
        // TODO: conventions?
        ? pipeline.parseJsonlAsync('Item')
        : pipeline .parseJsonAsync([
            new TransformKeysJsonStream(getTransformJsonKeysProfile("DocumentLoad", conventions)),
            pick({ filter: "results" }),
            streamArray()
        ]);
}

export function getDocumentResultsPipeline(
    conventions: DocumentConventions
): RavenCommandResponsePipeline<object[]> {
    const pipeline = RavenCommandResponsePipeline.create<object[]>();

    return conventions.useJsonlStreaming
        ? pipeline .parseJsonlAsync('Item', {
            transforms: [
                // TODO: conventions?
                jsonlStringer({ replacer: (key, value) => key === '' ? value.value : value }),
            ]
        })
        : pipeline
            .parseJsonAsync([
                new TransformKeysJsonStream(getTransformJsonKeysProfile("DocumentLoad", conventions)),
                stringer({ useValues: true })
            ]);
}

export async function streamResultsIntoStream(
    bodyStream: stream.Stream,
    conventions: DocumentConventions,
    writable: stream.Writable
): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        getDocumentResultsPipeline(conventions)
            .stream(bodyStream, writable, (err) => {
                err ? reject(err) : resolve();
            });
    });
}

export function getDocumentStatsPipeline(
    conventions: DocumentConventions
): RavenCommandResponsePipeline<object[]> {
    const pipeline = RavenCommandResponsePipeline.create<object[]>();

    return conventions.useJsonlStreaming
        ? pipeline.parseJsonlAsync('Stats')
        : pipeline.parseJsonAsync([
            ignore({ filter: /^Results|Includes$/ }),
            new TransformKeysJsonStream(getTransformJsonKeysProfile("CommandResponsePayload")),
            streamValues()
        ]);
}
