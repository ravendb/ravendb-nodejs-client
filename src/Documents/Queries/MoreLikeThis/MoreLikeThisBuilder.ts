import {IMoreLikeThisOperations} from "./IMoreLikeThisOperations";
import {IMoreLikeThisBuilderForDocumentQuery} from "./IMoreLikeThisBuilderForDocumentQuery";
import {IMoreLikeThisBuilderBase} from "./IMoreLikeThisBuilderBase";
import {MoreLikeThisBase} from "./MoreLikeThisBase";
import {MoreLikeThisOptions} from "./MoreLikeThisOptions";
import {MoreLikeThisUsingAnyDocument} from "./MoreLikeThisUsingAnyDocument";
import {MoreLikeThisUsingDocument} from "./MoreLikeThisUsingDocument";
import {IDocumentQuery, IFilterDocumentQueryBase} from "../../..";
import {TypeUtil} from "../../../Utility/TypeUtil";
import {MoreLikeThisUsingDocumentForDocumentQuery} from "./MoreLikeThisUsingDocumentForDocumentQuery";

export class MoreLikeThisBuilder<T extends object>
    implements IMoreLikeThisOperations<T>, IMoreLikeThisBuilderForDocumentQuery<T>, IMoreLikeThisBuilderBase<T> {

    private _moreLikeThis: MoreLikeThisBase;

    public getMoreLikeThis(): MoreLikeThisBase {
        return this._moreLikeThis;
    }

    public usingAnyDocument(): IMoreLikeThisOperations<T> {
        this._moreLikeThis = new MoreLikeThisUsingAnyDocument();

        return this;
    }

    public usingDocument(documentJson: string): IMoreLikeThisOperations<T>;
    public usingDocument(builder: (query: IFilterDocumentQueryBase<T, IDocumentQuery<T>>) => IDocumentQuery<T>):
        IMoreLikeThisOperations<T>;
    public usingDocument(
        documentJsonOrBuilder: string
            | ((query: IFilterDocumentQueryBase<T, IDocumentQuery<T>>) => IDocumentQuery<T>)):
                IMoreLikeThisOperations<T> {
        if (TypeUtil.isString(documentJsonOrBuilder)) {
            this._moreLikeThis = new MoreLikeThisUsingDocument(documentJsonOrBuilder as string);
        } else {
            const builder = documentJsonOrBuilder as
                (query: IFilterDocumentQueryBase<T, IDocumentQuery<T>>) => IDocumentQuery<T>;
            this._moreLikeThis = new MoreLikeThisUsingDocumentForDocumentQuery();
            (this._moreLikeThis as MoreLikeThisUsingDocumentForDocumentQuery<T>).forDocumentQuery = builder;
        }

        return this;
    }

    public withOptions(options: MoreLikeThisOptions): IMoreLikeThisOperations<T> {
        this._moreLikeThis.options = options;

        return this;
    }
}
