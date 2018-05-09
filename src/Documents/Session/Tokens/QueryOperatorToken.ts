import {QueryOperator} from '../../Queries/QueryOperator';
import { QueryToken } from "./QueryToken";

export class QueryOperatorToken extends QueryToken {

    private _queryOperator: QueryOperator;

    private constructor(queryOperator: QueryOperator) {
        super();
        this._queryOperator = queryOperator;
    }

    public static AND: QueryOperatorToken = new QueryOperatorToken("AND");

    public static OR: QueryOperatorToken = new QueryOperatorToken("OR");

    public writeTo(writer): void {
        if (this._queryOperator === "AND") {
            writer.append("and");
            return;
        }

        writer.append("or");
    }
}
