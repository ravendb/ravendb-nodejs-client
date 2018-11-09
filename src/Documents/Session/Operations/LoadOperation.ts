import { InMemoryDocumentSessionOperations } from "../InMemoryDocumentSessionOperations";
import { getLogger } from "../../../Utility/LogUtil";
import { ObjectTypeDescriptor, EntitiesCollectionObject } from "../../..";
import { DocumentInfo } from "../DocumentInfo";
import { 
    GetDocumentsCommand, 
    GetDocumentsResult, 
    GetDocumentsByIdsCommandOptions 
} from "../../Commands/GetDocumentsCommand";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { throwError } from "../../../Exceptions";

const log = getLogger({ module: "LoadOperation" });

export class LoadOperation {

    private _session: InMemoryDocumentSessionOperations;

    private _ids: string[];
    private _includes: string[];
    private _countersToInclude: string[];
    private _includeAllCounters: boolean;
    private _idsToCheckOnServer: string[] = [];
    private _currentLoadResults: GetDocumentsResult;

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

        const opts: GetDocumentsByIdsCommandOptions = {
                ids: this._idsToCheckOnServer,
                includes: this._includes,
                metadataOnly: false,
                conventions: this._session.conventions
        };

        if (this._includeAllCounters) {
            opts.includeAllCounters = true;
        } else if (this._countersToInclude) {
            opts.counterIncludes = this._countersToInclude; 
        }

        return new GetDocumentsCommand(opts);
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

    public withCounters(counters: string[]): LoadOperation {
        if (counters) {
            this._countersToInclude = counters;
        }

        return this;
    }
     public withAllCounters() {
        this._includeAllCounters = true;
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
        if (this._session.noTracking) {
            if (!this._currentLoadResults) {
                throwError(
                    "InvalidOperationException", "Cannot execute 'getDocuments' before operation execution.");
            }

            const results = this._ids.filter(x => !!x)
                .reduce((result, next) => {
                    result[next] = null;
                    return result;
                }, {});
            
            for (const document of this._currentLoadResults.results) {
                if (!document) {
                    continue;
                }

                const newDocumentInfo = DocumentInfo.getNewDocumentInfo(document);
                results[newDocumentInfo.id] = this._session.trackEntity(clazz, newDocumentInfo);
            }
            
            return results;
        }

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
        
        if (this._session.noTracking) {
            this._currentLoadResults = result;
            return;
        }

        this._session.registerIncludes(result.includes);

        debugger;
        if (this._includeAllCounters || this._countersToInclude) {
            this._session.registerCounters(
                result.counterIncludes, this._ids, this._countersToInclude, this._includeAllCounters);
        }

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
