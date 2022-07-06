import * as stream from "readable-stream";
import * as promisify from "util.promisify";

export const finishedAsync: (src: any) => Promise<any> =
    promisify(stream.finished);
export const pipelineAsync: (...src: stream.Stream[]) => Promise<any> =
    promisify(stream.pipeline);

export function reduceStreamToPromise<T>(
    readable: stream.Readable,
    dataCallback?: (result: T, chunk: any) => T,
    seed?: T): Promise<T> {
    if (dataCallback) {
        readable.on("data", data => seed = dataCallback(seed, data));
    }

    return finishedAsync(readable)
        .then(() => seed);
}

export async function readToBuffer(stream: stream.Stream): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    stream
        .on("data", data => chunks.push(data));

    await finishedAsync(stream);

    return Buffer.concat(chunks);
}

export async function readToEnd(readable: stream.Readable | stream.Stream): Promise<string> {
    const chunks = [];
    readable.on("data", chunk => chunks.push(chunk));

    await finishedAsync(readable);
    return Buffer.concat(chunks).toString('utf-8');
}

export function bufferToReadable(b: Buffer) {
    const result = new stream.Readable();
    result.push(b);
    result.push(null);
    return result;
}

export function stringToReadable(s: string) {
    const result = new stream.Readable();
    result.push(s);
    result.push(null);
    return result;
}

export function printStreamTraffic(str) {
    // eslint-disable-next-line no-console
    str.on("data", d => console.log("READ", d.toString()));
    const orgWrite = str.write;
    str.write = (...args) => {
        // eslint-disable-next-line no-console
        console.log("WRITE", args[0]);
        return orgWrite.call(str, ...args);
    };
}
