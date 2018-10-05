import * as stream from "readable-stream";
import * as StreamUtil from "../../../Utility/StreamUtil";
import { RavenCommandResponsePipeline } from "../../../Http/RavenCommandResponsePipeline";
import { pick } from "stream-json/filters/Pick";
import { ignore } from "stream-json/filters/Ignore";
import { streamArray } from "stream-json/streamers/StreamArray";
import { streamObject } from "stream-json/streamers/StreamObject";
import { streamValues } from "stream-json/streamers/StreamValues";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";

export function getDocumentResultsPipeline(
    conventions: DocumentConventions): RavenCommandResponsePipeline<object[]> {

    return RavenCommandResponsePipeline.create<object[]>()
        .parseJsonAsync([
            pick({ filter: "Results" }),
            streamArray(),
        ])
        .streamKeyCaseTransform(conventions.entityFieldNameConvention, "DOCUMENT_LOAD");
}

export function getRestOfOutputPipeline(
    bodyStream: stream.Stream,
    ignoreFields: string | RegExp): RavenCommandResponsePipeline<object> {
    return RavenCommandResponsePipeline.create()
        .parseJsonAsync([
            ignore({ filter: ignoreFields }),
            streamValues()
        ])
        .streamKeyCaseTransform("camel");
}

export async function streamResultsIntoStream(
    bodyStream: stream.Stream,
    conventions: DocumentConventions,
    writable: stream.Writable): Promise<void> {

    const docsObjectStream = getDocumentResultsPipeline(conventions).stream(bodyStream);

    let endedArray = false;
    const restStream = stream.pipeline(
        getRestOfOutputPipeline(bodyStream, /Results|Includes/).stream(bodyStream),
        new stream.Transform({
            writableObjectMode: true,
            readableObjectMode: false,
            write(chunk, enc, callback) {
                const val = chunk["value"];
                if (!val) {
                    callback();
                    return;
                }

                this.push("]");
                endedArray = true;

                for (const key in val) {
                    if (val.hasOwnProperty(key)) {
                        this.push(`,"${key}":${JSON.stringify(val[key])}`);
                    }
                }
                callback();
            },
            flush(callback) {
                if (!endedArray) {
                    this.push("]");
                }

                this.push("}");
                callback();
            }
        }));

    let first = true;
    const resultsStream = stream.pipeline(
        docsObjectStream,
        new stream.Transform({
            writableObjectMode: true,
            readableObjectMode: false,
            write(chunk, enc, callback) {
                const json = JSON.stringify(chunk["value"]);
                if (first) {
                    first = false;
                    this.push(`{"results":[${json}`);
                } else {
                    this.push(`,${json}`);
                }

                callback();
            },
            flush(callback) {
                callback();
            }
        }));
    const mergedStream = StreamUtil.concatStreams(resultsStream, restStream);
    return StreamUtil.pipelineAsync(mergedStream, writable);
}
