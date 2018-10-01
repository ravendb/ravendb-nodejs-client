import { MoreLikeThisOptions } from "./MoreLikeThisOptions";

export interface IMoreLikeThisOperations<T> {
    withOptions(options: MoreLikeThisOptions): IMoreLikeThisOperations<T>;
}
