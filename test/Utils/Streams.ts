import * as stream from "readable-stream";

export function getStringWritable(): stream.Writable {
    let buf = "";
    return new stream.Writable({
        write(chunk, enc, callback) {
            buf += chunk.toString();
            callback();
        },
        final(callback) {
            this.emit("content", buf);
            callback();
        }
    });
}