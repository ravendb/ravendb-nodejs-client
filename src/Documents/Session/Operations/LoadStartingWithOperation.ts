import { InMemoryDocumentSessionOperations } from "../InMemoryDocumentSessionOperations";
import { GetDocumentsCommand, GetDocumentsResult } from "../../Commands/GetDocumentsCommand";
import { SessionLoadStartingWithOptions, StartingWithOptions } from "../IDocumentSession";
import { DocumentInfo } from "../DocumentInfo";
import { DocumentType } from "../../DocumentAbstractions";
import { ObjectTypeDescriptor } from "../../..";

export class LoadStartingWithOperation {

    private static DEFAULT: StartingWithOptions = {
        start: 0,
        pageSize: 25,
        exclude: null,
        startAfter: null,
        matches: null
    };

    private _session: InMemoryDocumentSessionOperations;

    private _startWith: string;
    private _matches: string;
    private _start: number;
    private _pageSize: number;
    private _exclude: string;
    private _startAfter: string;

    private _returnedIds: string[] = [];

    public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    public createRequest(): GetDocumentsCommand  {
        this._session.incrementRequestCount();

        return new GetDocumentsCommand({
            startsWith: this._startWith, 
            startsAfter: this._startAfter, 
            matches: this._matches, 
            exclude: this._exclude, 
            start: this._start, 
            pageSize: this._pageSize, 
            metadataOnly: false
        });
    }

    public withStartWith(idPrefix: string, opts: StartingWithOptions): void {
        const optsToUse = Object.assign({}, LoadStartingWithOperation.DEFAULT, opts);
        this._startWith = idPrefix;
        this._matches = opts.matches;
        this._start = opts.start;
        this._pageSize = opts.pageSize;
        this._exclude = opts.exclude;
        this._startAfter = opts.startAfter;
    }

    public setResult(result: GetDocumentsResult): void {
        for (const document of result.results) {
            const newDocumentInfo = DocumentInfo.getNewDocumentInfo(document);
            this._session.documentsById.add(newDocumentInfo);
            this._returnedIds.push(newDocumentInfo.id);
        }
    }

    public getDocuments<T extends Object>(docType: DocumentType<T>): T[] {
        const entityType = this._session.conventions.findEntityType<T>(docType);
        return this._returnedIds.reduce((result, id) => {
            const doc = this._getDocument(entityType, id);
            return [ ...result, doc ];
        }, []);
    }

    private _getDocument<T extends Object>(entityType: ObjectTypeDescriptor<T>, id: string): T {
        if (!id) {
            return null;
        }

        if (this._session.isDeleted(id)) {
            return null;
        }

        const doc = this._session.documentsById.getValue(id);
        if (doc) {
            return this._session.trackEntity<T>(entityType, doc);
        }

        return null;
    }
}
