import { MoreLikeThisBase } from "./MoreLikeThisBase";
import { IFilterDocumentQueryBase } from "../../Session/IFilterDocumentQueryBase";
import { IDocumentQuery } from "../../Session/IDocumentQuery";

export class MoreLikeThisUsingDocumentForDocumentQuery<T extends object> extends MoreLikeThisBase {
    public forDocumentQuery: (query: IFilterDocumentQueryBase<T, IDocumentQuery<T>>) => IDocumentQuery<T>;
}
