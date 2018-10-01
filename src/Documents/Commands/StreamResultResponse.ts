import * as stream from "readable-stream";
import {HttpResponse} from "../../Primitives/Http";

export interface StreamResultResponse {
    response: HttpResponse;
    stream: stream.Readable;
}
