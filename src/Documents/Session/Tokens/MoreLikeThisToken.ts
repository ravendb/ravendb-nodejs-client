import { WhereToken } from "./WhereToken.js";
import { QueryToken } from "./QueryToken.js";
import { DocumentQueryHelper } from "../DocumentQueryHelper.js";
import { StringBuilder } from "../../../Utility/StringBuilder.js";

export class MoreLikeThisToken extends WhereToken {

    public documentParameterName: string;
    public optionsParameterName: string;
    public whereTokens: QueryToken[] = [];

    public constructor() {
        super();
    }

    public writeTo(writer: StringBuilder): void {
        writer.append("moreLikeThis(");

        if (!this.documentParameterName) {
            if (this.whereTokens.length === 0) {
                writer.append("true");
            } else {
                for (let i = 0; i < this.whereTokens.length; i++) {
                    DocumentQueryHelper.addSpaceIfNeeded(
                        i > 0 ? this.whereTokens[i - 1] : null, this.whereTokens[i], writer);
                    this.whereTokens[i].writeTo(writer);
                }
            }
        } else {
            writer.append("$").append(this.documentParameterName);
        }

        if (!this.optionsParameterName) {
            writer.append(")");
            return;
        }

        writer.append(", $")
            .append(this.optionsParameterName)
            .append(")");
    }
}
