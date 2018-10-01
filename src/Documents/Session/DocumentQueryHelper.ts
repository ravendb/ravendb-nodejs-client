import * as StringBuilder from "string-builder";
import { CloseSubclauseToken } from "./Tokens/CloseSubclauseToken";
import { QueryToken } from "./Tokens/QueryToken";
import { OpenSubclauseToken } from "./Tokens/OpenSubclauseToken";
import { IntersectMarkerToken } from "./Tokens/IntersectMarkerToken";

export class DocumentQueryHelper {
    public static addSpaceIfNeeded(
        previousToken: QueryToken, currentToken: QueryToken, writer: StringBuilder): void {
        if (!previousToken) {
            return;
        }

        if ((previousToken.constructor &&
            previousToken.constructor.name === OpenSubclauseToken.name)
            || (currentToken.constructor &&
                (currentToken.constructor.name === CloseSubclauseToken.name
                    || currentToken.constructor.name === IntersectMarkerToken.name))) {
            return;
        }
        writer.append(" ");
    }
}
