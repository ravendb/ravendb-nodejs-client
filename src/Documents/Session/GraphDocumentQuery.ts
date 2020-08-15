import { AbstractDocumentQuery } from "./AbstractDocumentQuery";
import { IGraphDocumentQuery } from "./IGraphDocumentQuery";
import { DocumentType } from "../DocumentAbstractions";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { QueryOperator } from "../Queries/QueryOperator";
import { QueryStatistics } from "./QueryStatistics";
import { ValueCallback } from "../../Types/Callbacks";
import { QueryTimings } from "../Queries/Timings/QueryTimings";
import { IDocumentQuery } from "./IDocumentQuery";
import { TypeUtil } from "../../Utility/TypeUtil";
import { DocumentQuery } from "./DocumentQuery";
import { IDocumentSession } from "./IDocumentSession";
import { DocumentQueryOptions } from "./QueryOptions";
import { WithEdgesToken } from "./Tokens/WithEdgesToken";
import { throwError } from "../../Exceptions/index";
import { WithToken } from "./Tokens/WithToken";

export class GraphDocumentQuery<T extends object> extends AbstractDocumentQuery<T, GraphDocumentQuery<T>> implements IGraphDocumentQuery<T> {
    public constructor(session: InMemoryDocumentSessionOperations, graphQuery: string, clazz: DocumentType<T>) {
        super(clazz, session, null, null, false, null, null);

        this._graphQuery(graphQuery);
    }

    usingDefaultOperator(queryOperator: QueryOperator): IGraphDocumentQuery<T> {
        this._usingDefaultOperator(queryOperator);
        return this;
    }

    public waitForNonStaleResults(): IGraphDocumentQuery<T>;
    public waitForNonStaleResults(waitTimeout?: number): IGraphDocumentQuery<T>;
    public waitForNonStaleResults(waitTimeout?: number): IGraphDocumentQuery<T> {
        this._waitForNonStaleResults(waitTimeout || null);
        return this;
    }

    public addParameter(name: string, value: any): IGraphDocumentQuery<T> {
        super.addParameter(name, value);
        return this;
    }


    /* TODO
    +
    +    @Override
    +    public IGraphDocumentQuery<T> addAfterStreamExecutedListener(Consumer<ObjectNode> action) {
    +        _addAfterStreamExecutedListener(action);
    +        return this;
    +    }
    +
    +    @Override
    +    public IGraphDocumentQuery<T> removeAfterStreamExecutedListener(Consumer<ObjectNode> action) {
    +        _removeAfterStreamExecutedListener(action);
    +        return this;
    +    }
    +
    +    @Override
    +    public IGraphDocumentQuery<T> addBeforeQueryExecutedListener(Consumer<IndexQuery> action) {
    +        _addBeforeQueryExecutedListener(action);
    +        return this;
    +    }
    +
    +    @Override
    +    public IGraphDocumentQuery<T> removeBeforeQueryExecutedListener(Consumer<IndexQuery> action) {
    +        _removeBeforeQueryExecutedListener(action);
    +        return this;
    +    }
    +
    +    @Override
    +    public IGraphDocumentQuery<T> addAfterQueryExecutedListener(Consumer<QueryResult> action) {
    +        _addAfterQueryExecutedListener(action);
    +        return this;
    +    }
    +
    +    @Override
    +    public IGraphDocumentQuery<T> removeAfterQueryExecutedListener(Consumer<QueryResult> action) {
    +        _removeAfterQueryExecutedListener(action);
    +        return this;
    +    }
    +
    +
    */
    public skip(count: number): IGraphDocumentQuery<T> {
        this._skip(count);
        return this;
    }

    public statistics(statsCallback: (stats: QueryStatistics) => void): IGraphDocumentQuery<T> {
        this._statistics(statsCallback);
        return this;
    }

    public take(count: number): IGraphDocumentQuery<T> {
        this._take(count);
        return this;
    }

    public noCaching(): IGraphDocumentQuery<T> {
        this._noCaching();
        return this;
    }

    public noTracking(): IGraphDocumentQuery<T> {
        this._noTracking();
        return this;
    }

    public timings(timings: ValueCallback<QueryTimings>): IGraphDocumentQuery<T> {
        this._includeTimings(timings);
        return this;
    }

    withQuery<TOther extends object>(alias: string, query: IDocumentQuery<TOther>): IGraphDocumentQuery<T>;
    withQuery<TOther extends object>(alias: string, rawQuery: string, documentType: DocumentType<TOther>): IGraphDocumentQuery<T>;
    withQuery<TOther extends object>(alias: string,
                                     queryFactory: (builder: GraphDocumentQueryBuilder) => IDocumentQuery<TOther>):
        IGraphDocumentQuery<T>;
    withQuery<TOther extends object>(alias: string, queryRawQueryOrBuilder: IDocumentQuery<TOther> | string | ((builder: GraphDocumentQueryBuilder) => IDocumentQuery<TOther>), documentType?: DocumentType<TOther>) {
        if (TypeUtil.isString(queryRawQueryOrBuilder)) {
            const rawQuery  = queryRawQueryOrBuilder;
            return this._withInternal(alias, documentType, this.session.advanced.rawQuery(rawQuery, documentType) as unknown as AbstractDocumentQuery<TOther, any>);
        } else if (queryRawQueryOrBuilder instanceof DocumentQuery) {
            //TODO: ParameterPrefix = $"w{WithTokens.Count}p
            const documentQuery = queryRawQueryOrBuilder;
            return this._withInternal(alias, documentQuery.getQueryType(), documentQuery);
        } else {
            const queryFactory = queryRawQueryOrBuilder as (builder: GraphDocumentQueryBuilder) => IDocumentQuery<TOther>;
            const docQuery = queryFactory(new GraphDocumentQueryBuilder(this.session, "w" + this._withTokens.length + "p")) as DocumentQuery<TOther>;
            return this._withInternal(alias, docQuery.getQueryType(), docQuery);
        }
    }

    public withEdges(alias: string, edgeSelector: string, query: string) {
        this._withTokens.push(new WithEdgesToken(alias, edgeSelector, query));
        return this;
    }

    private _withInternal<TOther extends object>(alias: string, documentType: DocumentType<TOther>, docQuery: AbstractDocumentQuery<TOther, any>) {
        if (docQuery.selectTokens && docQuery.selectTokens.length > 0) {
            throwError("InvalidArgumentException", "Select is not permitted in a 'with' clause in query: " + docQuery);
        }

        for (const key of Object.keys(docQuery.queryParameters)) {
            this._queryParameters[key] = docQuery.queryParameters[key];
        }

        this._withTokens.push(new WithToken(alias, docQuery.toString()));

        if (docQuery.theWaitForNonStaleResults) {
            this._theWaitForNonStaleResults = true;

            if (!this._timeout || this._timeout < docQuery.timeout) {
                this._timeout = docQuery.timeout;
            }
        }

        return this;
    }
}

export class GraphDocumentQueryBuilder {
    private readonly _session: IDocumentSession;
    private readonly _parameterPrefix: string;

    public constructor(session: IDocumentSession, parameterPrefix: string) {
        this._session = session;
        this._parameterPrefix = parameterPrefix;
    }

    public query<T extends object>(documentType: DocumentType<T>): IDocumentQuery<T>;
    public query<T extends object>(opts: DocumentQueryOptions<T>): IDocumentQuery<T>;
    public query<T extends object>(
        docTypeOrOpts: DocumentType<T> | DocumentQueryOptions<T>): IDocumentQuery<T> {

        if (TypeUtil.isDocumentType(docTypeOrOpts)) {
            const query = this._session.query({
                documentType: docTypeOrOpts as DocumentType<T>
            }) as DocumentQuery<T>;
            query.parameterPrefix = this._parameterPrefix;
            return query;
        }

        const query = this._session.query(docTypeOrOpts as DocumentQueryOptions<T>) as DocumentQuery<T>;
        query.parameterPrefix = this._parameterPrefix;
        return query;
    }
}