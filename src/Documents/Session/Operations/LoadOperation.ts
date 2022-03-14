import { InMemoryDocumentSessionOperations } from "../InMemoryDocumentSessionOperations";
import { getLogger } from "../../../Utility/LogUtil";
import { DocumentInfo } from "../DocumentInfo";
import { 
    GetDocumentsCommand, 
    GetDocumentsResult, 
    GetDocumentsByIdsCommandOptions 
} from "../../Commands/GetDocumentsCommand";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { throwError } from "../../../Exceptions";
import { ObjectTypeDescriptor, EntitiesCollectionObject } from "../../../Types";
import { StringUtil } from "../../../Utility/StringUtil";
import { TimeSeriesRange } from "../../Operations/TimeSeries/TimeSeriesRange";
import { AbstractTimeSeriesRange } from "../../Operations/TimeSeries/AbstractTimeSeriesRange";

const log = getLogger({ module: "LoadOperation" });

export class LoadOperation {

    private _session: InMemoryDocumentSessionOperations;

    private _ids: string[];
    private _includes: string[];
    private _countersToInclude: string[];
    private _compareExchangeValuesToInclude: string[];
    private _includeAllCounters: boolean;
    private _timeSeriesToInclude: AbstractTimeSeriesRange[];

    private _resultsSet: boolean;
    private _results: GetDocumentsResult;

    public constructor(session: InMemoryDocumentSessionOperations) {
        this._session = session;
    }

    public createRequest(): GetDocumentsCommand {
        if (this._session.checkIfIdAlreadyIncluded(this._ids, this._includes)) {
            return null;
        }

        this._session.incrementRequestCount();

        log.info("Requesting the following ids "
            + this._ids.join(",") + " from " + this._session.storeIdentifier);

        const opts: GetDocumentsByIdsCommandOptions = {
            ids: this._ids,
            includes: this._includes,
            metadataOnly: false,
            conventions: this._session.conventions,
            timeSeriesIncludes: this._timeSeriesToInclude,
            compareExchangeValueIncludes: this._compareExchangeValuesToInclude
        };

        if (this._includeAllCounters) {
            opts.includeAllCounters = true;
        } else if (this._countersToInclude) {
            opts.counterIncludes = this._countersToInclude; 
        }

        return new GetDocumentsCommand(opts);
    }

    public byId(id: string): LoadOperation {
        if (StringUtil.isNullOrEmpty(id)) {
            return this;
        }

        if (!this._ids) {
            this._ids = [id];
        }

        return this;
    }

    public withCompareExchange(compareExchangeValues: string[]) {
        this._compareExchangeValuesToInclude = compareExchangeValues;
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

    public withTimeSeries(timeSeries: AbstractTimeSeriesRange[]) {
        if (timeSeries) {
            this._timeSeriesToInclude = timeSeries;
        }
        return this;
    }

    public withIncludes(includes: string[]): LoadOperation {
        this._includes = includes || [];
        return this;
    }

    public byIds(ids: string[]): LoadOperation {
        const distinct = new Set(ids.filter(x => !StringUtil.isNullOrEmpty(x)));

        this._ids = Array.from(distinct);

        return this;
    }

    public getDocument<T extends object>(clazz: ObjectTypeDescriptor<T>): T | null {
        if (this._session.noTracking) {
            if (!this._resultsSet && this._ids.length) {
                throwError("InvalidOperationException", "Cannot execute getDocument before operation execution.");
            }

            if (!this._results || !this._results.results || !this._results.results.length) {
                return null;
            }

            const document = this._results.results[0];
            if (!document) {
                return null;
            }

            const documentInfo = DocumentInfo.getNewDocumentInfo(document);
            return this._session.trackEntity(clazz, documentInfo);
        }

        return this._getDocument(clazz, this._ids[0]);
    }

    private _getDocument<T extends object>(clazz: ObjectTypeDescriptor<T>, id: string): T | null {
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
            if (!this._resultsSet && this._ids.length) {
                throwError(
                    "InvalidOperationException", "Cannot execute 'getDocuments' before operation execution.");
            }

            const finalResults = this._ids.filter(x => !!x)
                .reduce((result, next) => {
                    result[next] = null;
                    return result;
                }, {});

            if (!this._results || !this._results.results || !this._results.results.length) {
                return finalResults;
            }
            
            for (const document of this._results.results) {
                if (!document) {
                    continue;
                }

                const newDocumentInfo = DocumentInfo.getNewDocumentInfo(document);
                finalResults[newDocumentInfo.id] = this._session.trackEntity(clazz, newDocumentInfo);
            }
            
            return finalResults;
        }

        return this._ids.filter(x => !!x)
            .reduce((result, id) => {
                result[id] = this._getDocument(clazz, id);
                return result;
            }, {});
    }

    public setResult(result: GetDocumentsResult): void {
        this._resultsSet = true;

        if (this._session.noTracking) {
            this._results = result;
            return;
        }

        if (!result) {
            this._session.registerMissing(this._ids);
            return;
        }

        this._session.registerIncludes(result.includes);


        if (this._includeAllCounters || this._countersToInclude) {
            this._session.registerCounters(
                result.counterIncludes, this._ids, this._countersToInclude, this._includeAllCounters);
        }

        if (this._timeSeriesToInclude) {
            this._session.registerTimeSeries(result.timeSeriesIncludes);
        }

        if (this._compareExchangeValuesToInclude) {
            this._session.clusterSession.registerCompareExchangeValues(result.compareExchangeValueIncludes);
        }

        for (const document of result.results) {
            if (!document || TypeUtil.isNullOrUndefined(document)) {
                continue;
            }

            const newDocumentInfo = DocumentInfo.getNewDocumentInfo(document);
            this._session.documentsById.add(newDocumentInfo);
        }

        for (const id of this._ids) {
            const value = this._session.documentsById.getValue(id);
            if (!value) {
                this._session.registerMissing(id);
            }
        }

        this._session.registerMissingIncludes(result.results, result.includes, this._includes);
    }
}
