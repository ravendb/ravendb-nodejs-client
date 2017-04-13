/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import * as Promise from 'bluebird';
import {RequestsExecutor} from "../src/Http/Request/RequestsExecutor";
import {IDocumentStore} from "../src/Documents/IDocumentStore";
import {IDocumentSession} from "../src/Documents/Session/IDocumentSession";

class RavenTestFixture {
    public readonly defaultUrl = "http://localhost.fiddler:8080";
    public readonly defaultDatabase = "NorthWindTest";
    private _requestsExecutor: RequestsExecutor;
    private _store: IDocumentStore;
    private _session: IDocumentSession;
    private  _indexMap: string;

    get requestsExecutor(): RequestsExecutor {
        return this._requestsExecutor;
    }

    get store(): IDocumentStore {
        return this._store;
    }

    set store(value: IDocumentStore) {
        this._store = value;
    }

    get session(): IDocumentSession {
        return this._session;
    }

    set session(value: IDocumentSession) {
        this._session = value;
    }

    get indexMap(): string {
        return this._indexMap;
    }

    set indexMap(value: string) {
        this._indexMap = value;
    }

    public initialize(): Promise<void> {
        this._indexMap = "from doc in docs select new{Tag = doc['@metadata']['@collection'], LastModified = (DateTime)doc['@metadata']['Last-Modified'], LastModifiedTicks = ((DateTime)doc['@metadata']['Last-Modified']).Ticks}";

        return Promise.resolve();
    }

    public finalize(): Promise<void> {
        return Promise.resolve();
    }
}

export default new RavenTestFixture();