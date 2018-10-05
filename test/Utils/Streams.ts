import * as stream from "readable-stream";

export function getStringWritable(): stream.Writable {
    let buf = "";
    const result = new stream.Writable({
        write(chunk, enc, callback) {
            buf += chunk.toString();
            callback();
        },
        final(callback) {
            (this as any).string = buf;
            callback();
        }
    });

    return result;
}
