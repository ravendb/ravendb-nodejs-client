import { QueryResultBase } from "../QueryResultBase";

export class MoreLikeThisQueryResult extends QueryResultBase<object[], object> {
    public durationInMs: number;
}
