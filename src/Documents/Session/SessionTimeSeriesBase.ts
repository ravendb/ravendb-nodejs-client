/**
 * Abstract implementation for in memory session operations
 */
import { InMemoryDocumentSessionOperations } from "./InMemoryDocumentSessionOperations";
import { throwError } from "../../Exceptions";
import { TypeUtil } from "../../Utility/TypeUtil";
import { StringUtil } from "../../Utility/StringUtil";
import { AppendOperation, DeleteOperation, IncrementOperation } from "../Operations/TimeSeries/TimeSeriesOperation";
import { IdTypeAndName } from "../IdTypeAndName";
import { TimeSeriesBatchCommandData } from "../Commands/Batches/TimeSeriesBatchCommandData";
import { TimeSeriesEntry } from "./TimeSeries/TimeSeriesEntry";
import { TimeSeriesRangeResult } from "../Operations/TimeSeries/TimeSeriesRangeResult";
import { DatesComparator, definedDate, leftDate, rightDate } from "../../Primitives/DatesComparator";
import { GetTimeSeriesOperation } from "../Operations/TimeSeries/GetTimeSeriesOperation";
import { CaseInsensitiveKeysMap } from "../../Primitives/CaseInsensitiveKeysMap";
import { TimeSeriesRange } from "../Operations/TimeSeries/TimeSeriesRange";
import { GetMultipleTimeSeriesOperation } from "../Operations/TimeSeries/GetMultipleTimeSeriesOperation";
import { CONSTANTS } from "../../Constants";
import { ITimeSeriesIncludeBuilder } from "./Loaders/ITimeSeriesIncludeBuilder";
import { TimeSeriesDetails } from "../Operations/TimeSeries/TimeSeriesDetails";
import { IncrementalTimeSeriesBatchCommandData } from "../Commands/Batches/IncrementalTimeSeriesBatchCommandData";

export class SessionTimeSeriesBase {
    protected docId: string;
    protected name: string;
    protected session: InMemoryDocumentSessionOperations;

    protected constructor(session: InMemoryDocumentSessionOperations, entity: any, name: string)
    protected constructor(session: InMemoryDocumentSessionOperations, documentId: string, name: string)
    protected constructor(session: InMemoryDocumentSessionOperations, documentIdOrEntity: string | any, name: string) {
        if (TypeUtil.isString(documentIdOrEntity)) {
            const documentId = documentIdOrEntity;
            if (!documentId) {
                throwError("InvalidArgumentException", "DocumentId cannot be null");
            }

            if (!name) {
                throwError("InvalidArgumentException", "Name cannot be null");
            }

            this.docId = documentId;
            this.name = name;
            this.session = session;
        } else {
            const entity = documentIdOrEntity;
            if (!entity) {
                throwError("InvalidArgumentException", "Entity cannot be null");
            }
            const documentInfo = session.documentsByEntity.get(entity);
            if (!documentInfo) {
                this._throwEntityNotInSession();
                return;
            }

            if (StringUtil.isNullOrWhitespace(name)) {
                throwError("InvalidArgumentException", "Name cannot be null or whitespace");
            }

            this.docId = documentInfo.id;
            this.name = name;
            this.session = session;
        }
    }

    protected _appendInternal(timestamp: Date, valueOrValues: number[] | number, tag?: string): void {
        const values = TypeUtil.isArray(valueOrValues) ? valueOrValues : [valueOrValues];

        const documentInfo = this.session.documentsById.getValue(this.docId);
        if (documentInfo && this.session.deletedEntities.contains(documentInfo.entity)) {
            SessionTimeSeriesBase._throwDocumentAlreadyDeletedInSession(this.docId, this.name);
        }

        const op = new AppendOperation(timestamp, values, tag);
        const command = this.session.deferredCommandsMap.get(IdTypeAndName.keyFor(this.docId, "TimeSeries", this.name));

        if (command) {
            const tsCmd = command as TimeSeriesBatchCommandData;
            tsCmd.timeSeries.append(op);
        } else {
            const appends = [] as AppendOperation[];
            appends.push(op);
            this.session.defer(new TimeSeriesBatchCommandData(this.docId, this.name, appends, null));
        }
    }

    public delete(): void
    public delete(from: Date, to: Date): void;
    public delete(from?: Date, to?: Date): void {
        const documentInfo = this.session.documentsById.getValue(this.docId);
        if (documentInfo && this.session.deletedEntities.contains(documentInfo.entity)) {
            SessionTimeSeriesBase._throwDocumentAlreadyDeletedInSession(this.docId, this.name);
        }

        const op = new DeleteOperation(from, to);
        const command = this.session.deferredCommandsMap.get(IdTypeAndName.keyFor(this.docId, "TimeSeries", this.name));
        if (command) {
            const tsCmd = command as TimeSeriesBatchCommandData;
            tsCmd.timeSeries.delete(op);
        } else {
            const deletes = [] as DeleteOperation[];
            deletes.push(op);
            this.session.defer(new TimeSeriesBatchCommandData(this.docId, this.name, null, deletes));
        }


        this._removeFromCacheIfNeeded(from, to);
    }

    public deleteAt(at: Date) {
        this.delete(at, at);
    }

    private _removeFromCacheIfNeeded(from: Date, to: Date) {
        const cache = this.session.timeSeriesByDocId.get(this.docId);
        if (!cache) {
            return;
        }

        if (!from && !to) {
            cache.delete(this.name);
            return;
        }

        const ranges = cache.get(this.name);
        if (ranges && ranges.length) {
            const newRanges =
                ranges.filter(range => DatesComparator.compare(leftDate(range.from), leftDate(from)) > 0
                    || DatesComparator.compare(rightDate(range.to), rightDate(to)) < 0);
            cache.set(this.name, newRanges);
        }
    }

    protected _incrementInternal(timestamp: Date, values: number[]): void {
        const documentInfo = this.session.documentsById.getValue(this.docId);
        if (documentInfo && this.session.deletedEntities.contains(documentInfo.entity)) {
            SessionTimeSeriesBase._throwDocumentAlreadyDeletedInSession(this.docId, this.name);
        }

        const op = new IncrementOperation();
        op.timestamp = timestamp;
        op.values = values;

        const command = this.session.deferredCommandsMap.get(IdTypeAndName.keyFor(this.docId, "TimeSeriesWithIncrements", this.name));
        if (command) {
            const tsCmd = command as IncrementalTimeSeriesBatchCommandData;
            tsCmd.timeSeries.increment(op);
        } else {
            const list: IncrementOperation[] = [];
            list.push(op);
            this.session.defer(new IncrementalTimeSeriesBatchCommandData(this.docId, this.name, list));
        }
    }

    private static _throwDocumentAlreadyDeletedInSession(documentId: string, timeSeries: string) {
        throwError("InvalidOperationException", "Can't modify timeseries " + timeSeries
            + " of document " + documentId + ", the document was already deleted in this session");
    }

    protected _throwEntityNotInSession() {
        throwError("InvalidArgumentException", "Entity is not associated with the session, cannot perform timeseries operations to it. "
            + "Use documentId instead or track the entity in the session.");
    }

    public async getTimeSeriesAndIncludes(from: Date, to: Date, includes: (builder: ITimeSeriesIncludeBuilder) => void, start: number, pageSize: number): Promise<TimeSeriesEntry[]> {
        if (pageSize === 0) {
            return [];
        }

        const document = this.session.documentsById.getValue(this.docId);

        if (document) {
            const metadataTimeSeries = document.metadata[CONSTANTS.Documents.Metadata.TIME_SERIES] as string[];
            if (metadataTimeSeries && TypeUtil.isArray(metadataTimeSeries)) {

                if (!metadataTimeSeries.find(x => StringUtil.equalsIgnoreCase(x, this.name))) {
                    // the document is loaded in the session, but the metadata says that there is no such timeseries
                    return [];
                }
            }
        }

        this.session.incrementRequestCount();

        const rangeResult = await this.session.operations.send(new GetTimeSeriesOperation(this.docId, this.name, from, to, start, pageSize, includes), this.session.sessionInfo);

        if (!rangeResult) {
            return null;
        }

        if (!this.session.noTracking) {
            this._handleIncludes(rangeResult);

            let cache = this.session.timeSeriesByDocId.get(this.docId);
            if (!cache) {
                cache = CaseInsensitiveKeysMap.create();
                this.session.timeSeriesByDocId.set(this.docId, cache);
            }

            const ranges = cache.get(this.name);
            if (ranges && ranges.length > 0) {
                // update
                const index = DatesComparator.compare(leftDate(ranges[0].from), rightDate(to)) > 0 ? 0 : ranges.length;
                ranges.splice(index, 0, rangeResult);
            } else {
                const item: TimeSeriesRangeResult[] = [];
                item.push(rangeResult);
                cache.set(this.name, item);
            }
        }

        return rangeResult.entries;
    }

    private _handleIncludes(rangeResult: TimeSeriesRangeResult) {
        if (!rangeResult.includes) {
            return;
        }

        this.session.registerIncludes(rangeResult.includes);

        rangeResult.includes = null;
    }

    private static _skipAndTrimRangeIfNeeded(from: Date,
                                             to: Date,
                                             fromRange: TimeSeriesRangeResult,
                                             toRange: TimeSeriesRangeResult,
                                             values: TimeSeriesEntry[],
                                             skip: number,
                                             trim: number) {
        if (fromRange && DatesComparator.compare(rightDate(fromRange.to), leftDate(from)) >= 0) {
            // need to skip a part of the first range
            if (toRange && DatesComparator.compare(leftDate(toRange.from), rightDate(to)) <= 0) {
                // also need to trim a part of the last range
                return values.slice(skip, values.length - trim);
            }

            return values.slice(skip);
        }

        if (toRange && DatesComparator.compare(leftDate(toRange.from), rightDate(to)) <= 0) {
            // trim a part of the last range
            return values.slice(0, values.length - trim);
        }

        return values;
    }

    protected async _serveFromCache(from: Date, to: Date, start: number, pageSize: number, includes: (builder: ITimeSeriesIncludeBuilder) => void) {
        const cache = this.session.timeSeriesByDocId.get(this.docId);
        const ranges = cache.get(this.name);
        // try to find a range in cache that contains [from, to]
        // if found, chop just the relevant part from it and return to the user.

        // otherwise, try to find two ranges (fromRange, toRange),
        // such that 'fromRange' is the last occurence for which range.From <= from
        // and 'toRange' is the first occurence for which range.To >= to.
        // At the same time, figure out the missing partial ranges that we need to get from the server.

        let toRangeIndex: number;
        let fromRangeIndex = -1;

        let rangesToGetFromServer: TimeSeriesRange[];

        for (toRangeIndex = 0; toRangeIndex < ranges.length; toRangeIndex++) {
            if (DatesComparator.compare(leftDate(ranges[toRangeIndex].from), leftDate(from)) <= 0) {
                if (DatesComparator.compare(rightDate(ranges[toRangeIndex].to), rightDate(to)) >= 0
                    || (ranges[toRangeIndex].entries.length - start >= pageSize)) {
                    // we have the entire range in cache
                    // we have all the range we need
                    // or that we have all the results we need in smaller range

                    return SessionTimeSeriesBase._chopRelevantRange(ranges[toRangeIndex], from, to, start, pageSize);
                }

                fromRangeIndex = toRangeIndex;
                continue;
            }

            // can't get the entire range from cache
            if (!rangesToGetFromServer) {
                rangesToGetFromServer = [];
            }

            // add the missing part [f, t] between current range start (or 'from')
            // and previous range end (or 'to') to the list of ranges we need to get from server

            const fromToUse = toRangeIndex === 0 || DatesComparator.compare(rightDate(ranges[toRangeIndex - 1].to), leftDate(from)) < 0
                ? from
                : ranges[toRangeIndex - 1].to;

            const toToUse = DatesComparator.compare(leftDate(ranges[toRangeIndex].from), rightDate(to)) <= 0
                ? ranges[toRangeIndex].from
                : to;

            rangesToGetFromServer.push({
                name: this.name,
                from: fromToUse,
                to: toToUse
            });

            if (DatesComparator.compare(rightDate(ranges[toRangeIndex].to), rightDate(to)) >= 0) {
                break;
            }
        }

        if (toRangeIndex === ranges.length) {
            // requested range [from, to] ends after all ranges in cache
            // add the missing part between the last range end and 'to'
            // to the list of ranges we need to get from server

            if (!rangesToGetFromServer) {
                rangesToGetFromServer = [];
            }

            rangesToGetFromServer.push({
                name: this.name,
                from: ranges[ranges.length - 1].to,
                to
            });
        }

        // get all the missing parts from server

        this.session.incrementRequestCount();

        const details = await this.session.operations.send(
            new GetMultipleTimeSeriesOperation(this.docId, rangesToGetFromServer, start, pageSize, includes), this.session.sessionInfo);

        if (includes) {
            this._registerIncludes(details);
        }

        // merge all the missing parts we got from server
        // with all the ranges in cache that are between 'fromRange' and 'toRange'

        let resultToUser: TimeSeriesEntry[];

        const mergedValues = SessionTimeSeriesBase._mergeRangesWithResults(
            from,
            to,
            ranges,
            fromRangeIndex,
            toRangeIndex,
            details.values.get(this.name),
            r => resultToUser = r);

        if (!this.session.noTracking) {
            const fromDates = details.values.get(this.name)
                .map(x => leftDate(x.from));

            if (fromDates.length) {
                from = fromDates[0].date;

                fromDates.forEach(d => {
                    if (DatesComparator.compare(d, leftDate(from)) < 0) {
                        from = d.date;
                    }
                });
            } else {
                from = null;
            }

            const toDates = details.values.get(this.name)
                .map(x => rightDate(x.to))

            if (toDates.length) {
                to = toDates[0].date;
                toDates.forEach(d => {
                    if (DatesComparator.compare(d, rightDate(to)) > 0) {
                        to = d.date;
                    }
                })
            } else {
                to = null;
            }

            InMemoryDocumentSessionOperations.addToCache(this.name, from, to, fromRangeIndex, toRangeIndex, ranges, cache, mergedValues);
        }

        return resultToUser;
    }

    private _registerIncludes(details: TimeSeriesDetails) {
        for (const rangeResult of details.values.get(this.name)) {
            this._handleIncludes(rangeResult);
        }
    }

    private static _mergeRangesWithResults(from: Date,
                                           to: Date,
                                           ranges: TimeSeriesRangeResult[],
                                           fromRangeIndex: number,
                                           toRangeIndex: number,
                                           resultFromServer: TimeSeriesRangeResult[],
                                           resultToUserSetter: (value: TimeSeriesEntry[]) => void): TimeSeriesEntry[] {
        let skip = 0;
        let trim = 0;
        let currentResultIndex = 0;
        const mergedValues: TimeSeriesEntry[] = [];

        const start = fromRangeIndex !== -1 ? fromRangeIndex : 0;
        const end = toRangeIndex === ranges.length ? ranges.length - 1 : toRangeIndex;

        for (let i = start; i <= end; i++) {
            if (i === fromRangeIndex) {
                if (DatesComparator.compare(leftDate(ranges[i].from), leftDate(from)) <= 0 &&
                    DatesComparator.compare(leftDate(from), rightDate(ranges[i].to)) <= 0) {
                    // requested range [from, to] starts inside 'fromRange'
                    // i.e fromRange.From <= from <= fromRange.To
                    // so we might need to skip a part of it when we return the
                    // result to the user (i.e. skip [fromRange.From, from])

                    if (ranges[i].entries) {
                        for (const v of ranges[i].entries) {
                            mergedValues.push(v);

                            if (DatesComparator.compare(definedDate(v.timestamp), leftDate(from)) < 0) {
                                skip++;
                            }
                        }
                    }
                }

                continue;
            }

            if (currentResultIndex < resultFromServer.length
                && DatesComparator.compare(leftDate(resultFromServer[currentResultIndex].from), leftDate(ranges[i].from)) < 0) {
                // add current result from server to the merged list
                // in order to avoid duplication, skip first item in range
                // (unless this is the first time we're adding to the merged list)

                const toAdd = resultFromServer[currentResultIndex++]
                    .entries
                    .slice(mergedValues.length === 0 ? 0 : 1);

                mergedValues.push(...toAdd);
            }

            if (i === toRangeIndex) {
                if (DatesComparator.compare(leftDate(ranges[i].from), rightDate(to)) <= 0) {
                    // requested range [from, to] ends inside 'toRange'
                    // so we might need to trim a part of it when we return the
                    // result to the user (i.e. trim [to, toRange.to])

                    for (let index = mergedValues.length === 0 ? 0 : 1; index < ranges[i].entries.length; index++) {
                        mergedValues.push(ranges[i].entries[index]);
                        if (DatesComparator.compare(definedDate(ranges[i].entries[index].timestamp), rightDate(to)) > 0) {
                            trim++;
                        }
                    }
                }

                continue;
            }

            // add current range from cache to the merged list.
            // in order to avoid duplication, skip first item in range if needed

            let shouldSkip = false;
            if (mergedValues.length > 0) {
                shouldSkip = ranges[i].entries[0].timestamp.getTime() === mergedValues[mergedValues.length - 1].timestamp.getTime();
            }

            const toAdd = ranges[i].entries.slice(!shouldSkip ? 0 : 1);
            mergedValues.push(...toAdd);
        }

        if (currentResultIndex < resultFromServer.length) {
            // the requested range ends after all the ranges in cache,
            // so the last missing part is from server
            // add last missing part to the merged list

            const toAdd = resultFromServer[currentResultIndex++]
                .entries
                .slice(mergedValues.length === 0 ? 0 : 1);
            mergedValues.push(...toAdd);
        }

        resultToUserSetter(SessionTimeSeriesBase._skipAndTrimRangeIfNeeded(from,
            to,
            fromRangeIndex === -1 ? null : ranges[fromRangeIndex],
            toRangeIndex === ranges.length ? null : ranges[toRangeIndex],
            mergedValues,
            skip,
            trim));

        return mergedValues;
    }

    private static _chopRelevantRange(range: TimeSeriesRangeResult, from: Date, to: Date, start: number, pageSize: number): TimeSeriesEntry[] {
        if (!range.entries) {
            return [];
        }

        const result: TimeSeriesEntry[] = [];

        for (const value of range.entries) {
            if (DatesComparator.compare(definedDate(value.timestamp), rightDate(to)) > 0) {
                break;
            }

            if (DatesComparator.compare(definedDate(value.timestamp), leftDate(from)) < 0) {
                continue;
            }

            if (start-- > 0) {
                continue;
            }

            if (pageSize-- <= 0) {
                break;
            }

            result.push(value);
        }

        return result;
    }

    protected async _getFromCache(from: Date, to: Date, includes: (builder: ITimeSeriesIncludeBuilder) => void, start: number, pageSize: number) {
        // RavenDB-16060
        // Typed TimeSeries results need special handling when served from cache
        // since we cache the results untyped

        // in node we return untyped entries here

        const resultToUser = await this._serveFromCache(from, to, start, pageSize, includes);
        return resultToUser;
    }

    protected _notInCache(from: Date, to: Date) {
        const cache = this.session.timeSeriesByDocId.get(this.docId);
        if (!cache) {
            return true;
        }

        const ranges = cache.get(this.name);
        if (!ranges) {
            return true;
        }

        return ranges.length === 0
            || DatesComparator.compare(leftDate(ranges[0].from), rightDate(to)) > 0
            || DatesComparator.compare(rightDate(ranges[ranges.length - 1].to), leftDate(from)) < 0;
    }
}

export interface CachedEntryInfo {
    servedFromCache: boolean;
    resultToUser: TimeSeriesEntry[];
    mergedValues: TimeSeriesEntry[];
    fromRangeIndex: number;
    toRangeIndex: number;
}
