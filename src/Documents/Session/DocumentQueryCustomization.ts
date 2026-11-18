import { IDocumentQueryCustomization } from "./IDocumentQueryCustomization.js";
import { AbstractDocumentQuery } from "./AbstractDocumentQuery.js";
import { QueryOperation } from "./Operations/QueryOperation.js";
import { QueryResult } from "../Queries/QueryResult.js";
import { IndexQuery } from "../Queries/IndexQuery.js";
import { ValueCallback } from "../../Types/Callbacks.js";
import { QueryTimings } from "../Queries/Timings/QueryTimings.js";
import { ProjectionBehavior } from "../Queries/ProjectionBehavior.js";
import { IQueryShardedContextBuilder } from "./Querying/Sharding/IQueryShardedContextBuilder.js";

export class DocumentQueryCustomization
    implements IDocumentQueryCustomization {

    private _query: AbstractDocumentQuery<any, any>;

    public constructor(query: AbstractDocumentQuery<any, any>) {
        this._query = query;
    }

    getQuery(): AbstractDocumentQuery<any, any> {
        return this._query;
    }

    public getQueryOperation(): QueryOperation {
        return this._query.queryOperation();
    }

    public on(
        eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): IDocumentQueryCustomization;
    public on(
        eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): IDocumentQueryCustomization;
    public on(
        eventName: "afterStreamExecuted", eventHandler: (eventArgs: object) => void): IDocumentQueryCustomization;
    public on(eventName: string, eventHandler: (eventArgs: any) => void): IDocumentQueryCustomization {
        this._query.on(eventName, eventHandler);
        return this;
    }

    public once(
        eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): IDocumentQueryCustomization;
    public once(
        eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): IDocumentQueryCustomization;
    public once(
        eventName: "afterStreamExecuted", eventHandler: (eventArgs: object) => void): IDocumentQueryCustomization;
    public once(eventName: string, eventHandler: (eventArgs: any) => void): IDocumentQueryCustomization {
        this._query.once(eventName, eventHandler);
        return this;
    }

    public removeListener(
        eventName: "beforeQueryExecuted", eventHandler: (eventArgs: IndexQuery) => void): IDocumentQueryCustomization;
    public removeListener(
        eventName: "afterQueryExecuted", eventHandler: (eventArgs: QueryResult) => void): IDocumentQueryCustomization;
    public removeListener(
        eventName: "afterStreamExecuted", eventHandler: (eventArgs: object) => void): IDocumentQueryCustomization;
    public removeListener(eventName: string, eventHandler: (eventArgs: any) => void): IDocumentQueryCustomization {
        this._query.removeListener(eventName, eventHandler);
        return this;
    }

    public noCaching(): IDocumentQueryCustomization {
        this._query._noCaching();
        return this;
    }

    public withTag(tag: string): IDocumentQueryCustomization {
        this._query.withTag(tag);
        return this;
    }

    public noTracking(): IDocumentQueryCustomization {
        this._query._noTracking();
        return this;
    }

    public randomOrdering(): IDocumentQueryCustomization;
    public randomOrdering(seed: string): IDocumentQueryCustomization;
    public randomOrdering(seed?: string): IDocumentQueryCustomization {
        this._query._randomOrdering(seed);
        return this;
    }

    public waitForNonStaleResults(): IDocumentQueryCustomization;
    public waitForNonStaleResults(waitTimeout: number): IDocumentQueryCustomization;
    public waitForNonStaleResults(waitTimeout?: number): IDocumentQueryCustomization {
        this._query._waitForNonStaleResults(waitTimeout);
        return this;
    }

    public timings(timings: ValueCallback<QueryTimings>): IDocumentQueryCustomization {
        this._query._includeTimings(timings);
        return this;
    }

    public projection(projectionBehavior: ProjectionBehavior): IDocumentQueryCustomization {
        this._query._projection(projectionBehavior);
        return this;
    }

    public shardContext(action: (builder: IQueryShardedContextBuilder) => void): IDocumentQueryCustomization {
        this._query._shardContext(action);
        return this;
    }

}
