import { throwError } from "../Exceptions";

export function isValidUri(uriString: string): boolean {
    // TODO
    return true;
}

export function validateUri(uriString: string): void {
    if (!isValidUri(uriString)) {
        throwError("InvalidArgumentException", `Uri ${uriString} is invalid.`);
    }
}
