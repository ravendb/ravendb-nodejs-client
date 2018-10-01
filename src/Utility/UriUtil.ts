import {throwError} from "../Exceptions";
import * as url from "url";

export function isValidUri(uriString: string): boolean {
    const parsed = url.parse(uriString);
    return !!(parsed.host && parsed.protocol);
}

export function validateUri(uriString: string): void {
    if (!isValidUri(uriString)) {
        throwError("InvalidArgumentException", `Uri ${uriString} is invalid.`);
    }
}
