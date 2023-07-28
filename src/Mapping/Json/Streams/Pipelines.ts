import * as stream from "readable-stream";
import { RavenCommandResponsePipeline } from "../../../Http/RavenCommandResponsePipeline";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { stringer as jsonlStringer } from "stream-json/jsonl/Stringer";
import { stringer } from "stream-json/Stringer";
import { TransformKeysJsonStream } from "./TransformKeysJsonStream";
import { getTransformJsonKeysProfile } from "./TransformJsonKeysProfiles";
import { pick } from "stream-json/filters/Pick";
import { streamArray } from "stream-json/streamers/StreamArray";

export function getDocumentResultsAsObjects(
    conventions: DocumentConventions,
    queryStream: boolean
): RavenCommandResponsePipeline<object[]> {
    const pipeline = RavenCommandResponsePipeline.create<object[]>();

    return conventions.useJsonlStreaming
        ? pipeline.parseJsonlAsync(queryStream ? "Item" : "Raw")
        : pipeline.parseJsonAsync([
            new TransformKeysJsonStream(getTransformJsonKeysProfile("DocumentLoad", conventions)),
            pick({ filter: "results" }),
            streamArray()
        ]);
}

export function getDocumentStreamResultsIntoStreamPipeline(
    conventions: DocumentConventions
): RavenCommandResponsePipeline<object[]> {
    const pipeline = RavenCommandResponsePipeline.create<object[]>();

    return conventions.useJsonlStreaming
        ? pipeline.parseJsonlAsync('Item', {
            transforms: [
                // TODO: conventions? + what's the purpose?
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
    writable: stream.Writable): Promise<void> {

    return new Promise<void>((resolve, reject) => {
        getDocumentStreamResultsIntoStreamPipeline(conventions)
            .stream(bodyStream, writable, (err) => {
                err ? reject(err) : resolve();
            });
    });
}
