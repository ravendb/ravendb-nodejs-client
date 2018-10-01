import {InMemoryDocumentSessionOperations} from "../InMemoryDocumentSessionOperations";
import {getLogger} from "../../../Utility/LogUtil";
import {ObjectTypeDescriptor, EntitiesCollectionObject} from "../../..";
import {DocumentInfo} from "../DocumentInfo";
import {GetDocumentsCommand, GetDocumentsResult} from "../../Commands/GetDocumentsCommand";
import {TypeUtil} from "../../../Utility/TypeUtil";

const log = getLogger({module: "LoadOperation"});

export class LoadOperation {

    private _session: InMemoryDocumentSessionOperations;

    private _ids: string[];
    private _includes: string[];
    private _idsToCheckOnServer: string[] = [];

    public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    public createRequest(): GetDocumentsCommand {

        if (this._idsToCheckOnServer.length === 0) {
            return null;
        }

        if (this._session.checkIfIdAlreadyIncluded(this._ids, this._includes)) {
            return null;
        }

        this._session.incrementRequestCount();

        log.info("Requesting the following ids "
            + this._idsToCheckOnServer.join(",") + " from " + this._session.storeIdentifier);

        return new GetDocumentsCommand({
            ids: this._idsToCheckOnServer,
            includes: this._includes,
            metadataOnly: false,
            conventions: this._session.conventions
        });
    }

    public byId(id: string): LoadOperation {
        if (!id) {
            return this;
        }

        if (!this._ids) {
            this._ids = [id];
        }

        if (this._session.isLoadedOrDeleted(id)) {
            return this;
        }

        this._idsToCheckOnServer.push(id);
        return this;
    }

    public withIncludes(includes: string[]): LoadOperation {
        this._includes = includes || [];
        return this;
    }

    public byIds(ids: string[]): LoadOperation {
        if (!ids || !ids.length) {
            return this;
        }

        this._ids = ids;

        const distinct = new Set(ids.filter(x => !!x));
        for (const id of distinct) {
            this.byId(id);
        }

        return this;
    }

    private _getDocument<T extends object>(clazz: ObjectTypeDescriptor<T>, id: string): T {
        if (!id) {
            return null;
        }

        if (this._session.isDeleted(id)) {
            return null;
        }

        let doc = this._session.documentsById.getValue(id);
        if (doc) {
            return this._session.trackEntity(clazz, doc);
        }

        doc = this._session.includedDocumentsById.get(id);
        if (doc) {
            return this._session.trackEntity(clazz, doc);
        }

        return null;
    }

    public getDocuments<T extends object>(clazz: ObjectTypeDescriptor<T>): EntitiesCollectionObject<T> {
        return this._ids.filter(x => !!x)
            .reduce((result, id) => {
                result[id] = this._getDocument(clazz, id);
                return result;
            }, {});
    }

    public setResult(result: GetDocumentsResult): void {
        if (!result) {
            return;
        }

        this._session.registerIncludes(result.includes);

        for (const document of result.results) {
            if (!document || TypeUtil.isNullOrUndefined(document)) {
                continue;
            }

            const newDocumentInfo = DocumentInfo.getNewDocumentInfo(document);
            this._session.documentsById.add(newDocumentInfo);
        }

        this._session.registerMissingIncludes(result.results, result.includes, this._includes);
    }
}
