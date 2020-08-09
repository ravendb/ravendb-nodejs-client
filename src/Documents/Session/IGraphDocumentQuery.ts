import { IQueryBase } from "./IQueryBase";
import { IDocumentQueryBaseSingle } from "./IDocumentQueryBaseSingle";
import { IEnumerableQuery } from "./IEnumerableQuery";
import { IDocumentQuery } from "./IDocumentQuery";
import { DocumentType } from "../DocumentAbstractions";
import { GraphDocumentQueryBuilder } from "./GraphDocumentQuery";

export interface IGraphDocumentQuery<T extends object> extends IQueryBase<T, IGraphDocumentQuery<T>>, IDocumentQueryBaseSingle<T>, IEnumerableQuery<T> {

    //TODO: check if we should shuffle parameters order to match current API
    withQuery<TOther extends object>(alias: string, query: IDocumentQuery<TOther>): IGraphDocumentQuery<T>;
    withQuery<TOther extends object>(alias: string, rawGraphDocumentQueryBuilderQuery: string, documentType: DocumentType<TOther>): IGraphDocumentQuery<T>;
    withQuery<TOther extends object>(alias: string,
                                     queryFactory: (builder: GraphDocumentQueryBuilder) => IDocumentQuery<TOther>):
        IGraphDocumentQuery<T>;

    withEdges(alias: string, edgeSelector: string, query: string): IGraphDocumentQuery<T>;
}