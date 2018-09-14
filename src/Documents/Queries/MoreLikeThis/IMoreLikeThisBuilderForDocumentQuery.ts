import {IMoreLikeThisBuilderBase} from "./IMoreLikeThisBuilderBase";
import {IDocumentQuery, IFilterDocumentQueryBase} from "../../..";
import {IMoreLikeThisOperations} from "./IMoreLikeThisOperations";

export interface IMoreLikeThisBuilderForDocumentQuery<T extends object> extends IMoreLikeThisBuilderBase<T> {
    usingDocument(documentJson: string): IMoreLikeThisOperations<T>;
    usingDocument(builder: (query: IFilterDocumentQueryBase<T, IDocumentQuery<T>>) => IDocumentQuery<T>):
        IMoreLikeThisOperations<T>;
    usingAnyDocument(): IMoreLikeThisOperations<T>;
}
