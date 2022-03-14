import { SessionCountersBase } from "./SessionCountersBase";
import { ISessionDocumentCounters } from "./ISessionDocumentCounters";
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { CaseInsensitiveKeysMap } from "../../Primitives/CaseInsensitiveKeysMap";
import { CONSTANTS } from "../../Constants";
import { GetCountersOperation } from "../Operations/Counters/GetCountersOperation";
import { ObjectUtil } from "../../Utility/ObjectUtil";

export class SessionDocumentCounters extends SessionCountersBase implements ISessionDocumentCounters {

    public constructor(session: InMemoryDocumentSessionOperations, entity: object);
    public constructor(session: InMemoryDocumentSessionOperations, documentId: string);
    public constructor(session: InMemoryDocumentSessionOperations, entityOrId: string | object) {
        super(session, entityOrId);
    }

    public async getAll(): Promise<{ [key: string]: number }> {
        let cache = this._session.countersByDocId.get(this._docId);
        if (!cache) {
            cache = {
                gotAll: false,
                data: CaseInsensitiveKeysMap.create<number>()
            };
        }

        let missingCounters = !cache.gotAll;
        const document = this._session.documentsById.getValue(this._docId);
        if (document) {
            const metadataCounters = document.metadata[CONSTANTS.Documents.Metadata.COUNTERS] as string[];
            if (!metadataCounters) {
                missingCounters = false;
            } else if (cache.data.size >= metadataCounters.length) {
                missingCounters = false;
                for (const c of metadataCounters) {
                    if (cache.data.has(c)) {
                        continue;
                    }

                    missingCounters = true;
                    break;
                }
            }
        }

        if (missingCounters) {
            // we either don't have the document in session and GotAll = false,
            // or we do and cache doesn't contain all metadata counters
            this._session.incrementRequestCount();
            const details = await this._session.operations.send(
                new GetCountersOperation(this._docId), this._session.sessionInfo);
            cache.data.clear();
            for (const counterDetail of details.counters) {
                cache.data.set(counterDetail.counterName, counterDetail.totalValue);
            }
        }
        cache.gotAll = true;
        if (!this._session.noTracking) {
            this._session.countersByDocId.set(this._docId, cache);
        }

        return ObjectUtil.mapToLiteral(cache.data);
    }

    public async get(counter: string): Promise<number | null>;
    public async get(counters: string[]): Promise<{ [key: string]: number }>;
    public async get(counters: string | string[]): Promise<any> {
        return Array.isArray(counters)
            ? this._getCounters(counters)
            : this._getCounter(counters);
    }

    private async _getCounter(counter: string): Promise<number> {
        let value = null;
        let cache = this._session.countersByDocId.get(this._docId);
        if (cache) {
            value = cache.data.get(counter) || null;
            if (cache.data.has(counter)) {
                return value;
            }
        } else {
            cache = { gotAll: false, data: CaseInsensitiveKeysMap.create<number>() };
        }

        const document = this._session.documentsById.getValue(this._docId);
        let metadataHasCounterName = false;
        if (document) {
            const metadataCounters = document.metadata["@counters"];
            if (metadataCounters) {
                metadataHasCounterName = metadataCounters.some(x => x.toLocaleLowerCase() === counter.toLocaleLowerCase());
            }
        }

        if ((!document && !cache.gotAll) || metadataHasCounterName) {
            // we either don't have the document in session and GotAll = false,
            // or we do and it's metadata contains the counter name
            this._session.incrementRequestCount();
            const details = await this._session.operations.send(
                new GetCountersOperation(this._docId, counter), this._session.sessionInfo);
            if (details.counters && details.counters.length) {
                const counterDetail = details.counters[0];

                value = counterDetail ? counterDetail.totalValue : null;
            }
        }

        cache.data.set(counter, value);
        if (!this._session.noTracking) {
            this._session.countersByDocId.set(this._docId, cache);
        }

        return value;
    }

    private async _getCounters(counters: string[]): Promise<{ [key: string]: number }> {
        let cache = this._session.countersByDocId.get(this._docId);
        if (!cache) {
            cache = { gotAll: false, data: CaseInsensitiveKeysMap.create<number>() };
        }

        let metadataCounters: string[] = null;
        const document = this._session.documentsById.getValue(this._docId);
        if (document) {
            metadataCounters = document.metadata[CONSTANTS.Documents.Metadata.COUNTERS] as string[];
        }

        const result = new Map<string, number>();
        for (const counter of counters) {
            const hasCounter = cache.data.has(counter);
            const val = cache.data.get(counter);
            let notInMetadata = true;

            if (document && metadataCounters) {
                notInMetadata = !metadataCounters.some(x => x.toLowerCase() === counter.toLowerCase());
            }

            if (hasCounter || cache.gotAll || (document && notInMetadata)) {
                // we either have value in cache,
                // or we have the metadata and the counter is not there,
                // or GotAll
                result.set(counter, val);
                continue;
            }

            result.clear();
            this._session.incrementRequestCount();

            const details = await this._session.operations.send(
                new GetCountersOperation(this._docId, counters), this._session.sessionInfo);
            for (const counterDetail of details.counters) {
                if (!counterDetail) {
                    continue;
                }
                cache.data.set(counterDetail.counterName, counterDetail.totalValue);
                result.set(counterDetail.counterName, counterDetail.totalValue);
            }

            break;
        }

        if (!this._session.noTracking) {
            this._session.countersByDocId.set(this._docId, cache);
        }

        return ObjectUtil.mapToLiteral(result);
    }
}
