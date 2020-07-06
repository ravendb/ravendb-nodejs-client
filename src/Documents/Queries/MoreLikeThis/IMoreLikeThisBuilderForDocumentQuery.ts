import { IMoreLikeThisBuilderBase } from "./IMoreLikeThisBuilderBase";
import { IMoreLikeThisOperations } from "./IMoreLikeThisOperations";
import { IFilterDocumentQueryBase } from "../../Session/IFilterDocumentQueryBase";
import { IDocumentQuery } from "../../Session/IDocumentQuery";

export interface IMoreLikeThisBuilderForDocumentQuery<T extends object> extends IMoreLikeThisBuilderBase<T> {
    usingDocument(documentJson: string): IMoreLikeThisOperations<T>;

    usingDocument(builder: (query: IFilterDocumentQueryBase<T, IDocumentQuery<T>>) => IDocumentQuery<T>):
        IMoreLikeThisOperations<T>;

    usingAnyDocument(): IMoreLikeThisOperations<T>;
}
