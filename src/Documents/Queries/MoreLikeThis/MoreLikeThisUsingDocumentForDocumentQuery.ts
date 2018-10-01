import { MoreLikeThisBase } from "./MoreLikeThisBase";
import { IDocumentQuery, IFilterDocumentQueryBase } from "../../..";

export class MoreLikeThisUsingDocumentForDocumentQuery<T extends object> extends MoreLikeThisBase {
    public forDocumentQuery: (query: IFilterDocumentQueryBase<T, IDocumentQuery<T>>) => IDocumentQuery<T>;
}
