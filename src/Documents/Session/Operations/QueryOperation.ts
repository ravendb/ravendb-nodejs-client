import { InMemoryDocumentSessionOperations } from "../InMemoryDocumentSessionOperations.js";
import { IndexQuery } from "../../Queries/IndexQuery.js";
import { QueryResult } from "../../Queries/QueryResult.js";
import { FieldsToFetchToken } from "../Tokens/FieldsToFetchToken.js";
import { Stopwatch } from "../../../Utility/Stopwatch.js";
import { getLogger } from "../../../Utility/LogUtil.js";
import { QueryCommand } from "../../Commands/QueryCommand.js";
import { throwError } from "../../../Exceptions/index.js";
import {
    DocumentType,
} from "../../DocumentAbstractions.js";
import { CONSTANTS, TIME_SERIES } from "../../../Constants.js";
import { TypeUtil } from "../../../Utility/TypeUtil.js";
import { Reference } from "../../../Utility/Reference.js";
import { NESTED_OBJECT_TYPES_PROJECTION_FIELD } from "../DocumentQuery.js";
import { TimeSeriesAggregationResult } from "../../Queries/TimeSeries/TimeSeriesAggregationResult.js";
import { TimeSeriesRawResult } from "../../Queries/TimeSeries/TimeSeriesRawResult.js";
import { TimeSeriesRangeAggregation } from "../../Queries/TimeSeries/TimeSeriesRangeAggregation.js";
import { ObjectChangeCaseOptions, ObjectUtil } from "../../../Utility/ObjectUtil.js";
import { TimeSeriesEntry } from "../TimeSeries/TimeSeriesEntry.js";
import { StringBuilder } from "../../../Utility/StringBuilder.js";
import { DateUtil } from "../../../Utility/DateUtil.js";

const log = getLogger({ module: "QueryOperation" });

const facetResultFields = ["Name", "Values", "RemainingHits", "RemainingTermsCount", "RemainingTerms"];

// noinspection ExceptionCaughtLocallyJS
export class QueryOperation {
    private readonly _session: InMemoryDocumentSessionOperations;
    private readonly _indexName: string;
    private readonly _indexQuery: IndexQuery;
    private readonly _metadataOnly: boolean;
    private readonly _indexEntriesOnly: boolean;
    private readonly _isProjectInto: boolean;
    private _currentQueryResults: QueryResult;
    private readonly _fieldsToFetch: FieldsToFetchToken;
    private _sp: Stopwatch;
    private _noTracking: boolean;

    public constructor(
        session: InMemoryDocumentSessionOperations,
        indexName: string,
        indexQuery: IndexQuery,
        fieldsToFetch: FieldsToFetchToken,
        disableEntitiesTracking: boolean,
        metadataOnly: boolean,
        indexEntriesOnly: boolean,
        isProjectInto: boolean) {
        this._session = session;
        this._indexName = indexName;
        this._indexQuery = indexQuery;
        this._fieldsToFetch = fieldsToFetch;
        this._noTracking = disableEntitiesTracking;
        this._metadataOnly = metadataOnly;
        this._indexEntriesOnly = indexEntriesOnly;
        this._isProjectInto = isProjectInto;
    }

    public createRequest(): QueryCommand {
        this._session.incrementRequestCount();

        this.logQuery();

        return new QueryCommand(this._session, this._indexQuery, {
            metadataOnly: this._metadataOnly,
            indexEntriesOnly: this._indexEntriesOnly
        });
    }

    public getCurrentQueryResults(): QueryResult {
        return this._currentQueryResults;
    }

    public setResult(queryResult: QueryResult): void {
        this.ensureIsAcceptableAndSaveResult(queryResult, null);
    }

    private _startTiming(): void {
        this._sp = Stopwatch.createStarted();
    }

    public logQuery(): void {
        log.info(
            "Executing query '" + this._indexQuery.query + "'"
            + (this._indexName ? "' on index '" + this._indexName + "'" : "")
            + " in " + this._session.storeIdentifier);
    }

    /* TDB 4.1
    public enterQueryContext(): IDisposable {
        this._startTiming();

        if (!this._indexQuery.waitForNonStaleResults) {
            return null;
        }

        return this._session.documentStore.disableAggressiveCaching(this._session.databaseName);
    }
    */

    public complete<T extends object>(documentType?: DocumentType<T>): T[] {
        this._session.assertNotDisposed();
        const queryResult = this._currentQueryResults.createSnapshot();

        const result = [] as T[];

        this._completeInternal(documentType, queryResult, x => result.push(x));

        return result;
    }

    private _completeInternal<T extends object>(documentType: DocumentType<T>, queryResult: QueryResult, addToResult: (item: T) => void): void {
        if (!this._noTracking) {
            this._session.registerIncludes(queryResult.includes);
        }

        try {
            for (const document of queryResult.results) {
                if (document[`${CONSTANTS.Documents.Metadata.KEY}.${CONSTANTS.Documents.Metadata.NESTED_OBJECT_TYPES}`]) {
                    document[CONSTANTS.Documents.Metadata.KEY][CONSTANTS.Documents.Metadata.NESTED_OBJECT_TYPES]
                        = document[`${CONSTANTS.Documents.Metadata.KEY}.${CONSTANTS.Documents.Metadata.NESTED_OBJECT_TYPES}`];
                }
                const metadata = document[CONSTANTS.Documents.Metadata.KEY];
                try {
                    const idNode = metadata[CONSTANTS.Documents.Metadata.ID];

                    let id = null;
                    if (idNode && TypeUtil.isString(idNode)) {
                        id = idNode;
                    }

                    addToResult(
                        QueryOperation.deserialize(
                            id,
                            document,
                            metadata,
                            this._fieldsToFetch,
                            this._noTracking,
                            this._session,
                            documentType,
                            this._isProjectInto,
                        queryResult.timeSeriesFields || []));
                } catch (e) {
                    if (Object.keys(document).length !== facetResultFields.length) {
                        throw e;
                    }

                    for (const prop of facetResultFields) {
                        if (!(prop in document)) {
                            throw e;
                        }
                    }

                    throwError("InvalidArgumentException", "Raw query with aggregation by facet should be called by executeAggregation method.");
                }
            }
        } catch (err) {
            log.warn(err, "Unable to read query result JSON.");
            throwError("RavenException", "Unable to read json.", err);
        }

        if (!this._noTracking) {
            this._session.registerMissingIncludes(
                queryResult.results, queryResult.includes, queryResult.includedPaths);

            if (queryResult.counterIncludes) {
                this._session.registerCounters(queryResult.counterIncludes, queryResult.includedCounterNames);
            }

            if (queryResult.timeSeriesIncludes) {
                this._session.registerTimeSeries(queryResult.timeSeriesIncludes);
            }

            if (queryResult.compareExchangeValueIncludes) {
                const clusterSession = this._session.clusterSession;
                clusterSession.registerCompareExchangeIncludes(queryResult.compareExchangeValueIncludes, false);
            }

            if (queryResult.revisionIncludes) {
                this._session.registerRevisionIncludes(queryResult.revisionIncludes);
            }
        }
    }

    public static deserialize<T extends object>(
        id: string,
        document: object,
        metadata: object,
        fieldsToFetch: FieldsToFetchToken,
        disableEntitiesTracking: boolean,
        session: InMemoryDocumentSessionOperations,
        clazz?: DocumentType<T>,
        isProjectInto?: boolean,
        timeSeriesFields?: string[]
    ) {
        const { conventions } = session;
        const projection = metadata["@projection"];
        if (TypeUtil.isNullOrUndefined(projection) || projection === false) {
            const entityType = conventions.getJsTypeByDocumentType(clazz);
            return session.trackEntity(entityType, id, document, metadata, disableEntitiesTracking);
        }

        const singleField = fieldsToFetch
            && fieldsToFetch.projections
            && (!clazz || clazz === TimeSeriesAggregationResult || clazz === TimeSeriesRawResult)
            && (fieldsToFetch.projections.length === 1 || (fieldsToFetch.projections.includes(NESTED_OBJECT_TYPES_PROJECTION_FIELD) && fieldsToFetch.projections.length === 2));

        // return primitives only if type was not passed at all AND fields count is 1
        // if type was passed then use that even if it's only 1 field
        if (singleField) {
            // we only select a single field
            let projectionField = fieldsToFetch.projections.find(x => x !== NESTED_OBJECT_TYPES_PROJECTION_FIELD);

            if (fieldsToFetch.sourceAlias) {
                if (projectionField.startsWith(fieldsToFetch.sourceAlias)) {
                    // remove source-alias from projection name
                    projectionField = projectionField.substring(fieldsToFetch.sourceAlias.length + 1);
                }

                if (projectionField.startsWith("'")) {
                    projectionField = projectionField.substring(1, projectionField.length - 1);
                }
            }
            if (conventions.serverToLocalFieldNameConverter) {
                projectionField = conventions.serverToLocalFieldNameConverter(projectionField);
            }

            const jsonNode = document[projectionField];
            if (TypeUtil.isNullOrUndefined(jsonNode)) {
                return null;
            }

            if (TypeUtil.isPrimitive(jsonNode)) {
                return jsonNode || null;
            }

            const isTimeSeriesField = fieldsToFetch.projections[0].startsWith(TIME_SERIES.QUERY_FUNCTION);

            if (!isProjectInto || isTimeSeriesField) {
                if (isTimeSeriesField || fieldsToFetch.fieldsToFetch[0] === fieldsToFetch.projections[0]) {
                    if (TypeUtil.isObject(jsonNode)) { // extraction from original type
                        document = jsonNode;
                    }
                }
            }
        }

        const projType = conventions.getJsTypeByDocumentType(clazz);

        const documentRef: Reference<object> = {
            value: document
        };
        session.onBeforeConversionToEntityInvoke(id, clazz, documentRef);
        document = documentRef.value;

        const raw: T = conventions.objectMapper.fromObjectLiteral(document);

        const result = projType ? new (Function.prototype.bind.apply(projType)) : {};

        const mapper = conventions.objectMapper;

        if (result instanceof TimeSeriesAggregationResult) {
            Object.assign(result, QueryOperation._reviveTimeSeriesAggregationResult(raw));
        } else if (result instanceof TimeSeriesRawResult) {
            Object.assign(result, QueryOperation._reviveTimeSeriesRawResult(raw));
        } else {
            if (fieldsToFetch && fieldsToFetch.projections && fieldsToFetch.projections.length) {
                const keys = conventions.serverToLocalFieldNameConverter
                    ? fieldsToFetch.projections.map(x => conventions.serverToLocalFieldNameConverter(x))
                    : fieldsToFetch.projections;

                const nestedTypes = raw[NESTED_OBJECT_TYPES_PROJECTION_FIELD];
                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];

                    const mapped = mapper.fromObjectLiteral(raw, {
                        typeName: "object",
                        nestedTypes
                    })

                    result[key] = mapped[key];
                }
            } else {
                if (conventions.serverToLocalFieldNameConverter) {
                    const options: ObjectChangeCaseOptions = {
                        recursive: true,
                        arrayRecursive: true,
                        ignorePaths: [
                            CONSTANTS.Documents.Metadata.IGNORE_CASE_TRANSFORM_REGEX,
                            /@projection/
                        ],
                        defaultTransform: conventions.serverToLocalFieldNameConverter
                    };

                    Object.assign(result, ObjectUtil.transformObjectKeys(raw, options));
                } else {
                    Object.assign(result, raw);
                }
            }
        }

        if (timeSeriesFields && timeSeriesFields.length) {
            for (const timeSeriesField of timeSeriesFields) {
                const value = document[timeSeriesField];
                if (value) {
                    const newValue = QueryOperation._detectTimeSeriesResultType(value);
                    if (newValue instanceof TimeSeriesAggregationResult) {
                        Object.assign(newValue, QueryOperation._reviveTimeSeriesAggregationResult(value));
                    } else if (newValue instanceof TimeSeriesRawResult) {
                        Object.assign(newValue, QueryOperation._reviveTimeSeriesRawResult(value));
                    }

                    result[timeSeriesField] = newValue;
                }
            }
        }

        session.onAfterConversionToEntityInvoke(id, document, result);

        return result;
    }

    private static _detectTimeSeriesResultType(raw: any): TimeSeriesAggregationResult | TimeSeriesRawResult  {
        const results = raw.Results || [];
        // duck typing
        if (results.length && results[0].From && results[0].To) {
            return new TimeSeriesAggregationResult();
        }
        return new TimeSeriesRawResult();
    }

    private static _reviveTimeSeriesAggregationResult(raw: object) {
        const rawLower = ObjectUtil.transformObjectKeys(raw, { defaultTransform: ObjectUtil.camel }) as any;

        const { results, ...otherProps } = rawLower;

        const mappedResults: TimeSeriesRangeAggregation[] = results.map(r => {
            const { from, to, ...otherRangeProps } = r;

            const overrides: Partial<TimeSeriesRangeAggregation> = {
                from: DateUtil.utc.parse(from),
                to: DateUtil.utc.parse(to)
            };

            return Object.assign(new TimeSeriesRangeAggregation(), otherRangeProps, overrides);
        });

        return {
            ...otherProps,
            results: mappedResults
        }
    }

    private static _reviveTimeSeriesRawResult(raw: object) {
        const rawLower = ObjectUtil.transformObjectKeys(raw, { defaultTransform: ObjectUtil.camel }) as any;

        const { results, ...otherProps } = rawLower;

        const mappedResults: TimeSeriesRangeAggregation[] = results.map(r => {
            const { timestamp, ...otherRangeProps } = r;

            const overrides: Partial<TimeSeriesEntry> = {
                timestamp: DateUtil.utc.parse(timestamp),
            };

            return Object.assign(new TimeSeriesEntry(), otherRangeProps, overrides);
        });

        return {
            ...otherProps,
            results: mappedResults
        }
    }

    public get noTracking() {
        return this._noTracking;
    }

    public set noTracking(value) {
        this._noTracking = value;
    }

    public ensureIsAcceptableAndSaveResult(result: QueryResult, duration: number): void {
        if (TypeUtil.isNullOrUndefined(duration)) {
            if (this._sp) {
                duration = this._sp.elapsed;
            } else {
                duration = null;
            }
        }

        if (!result) {
            throwError("IndexDoesNotExistException", `Could not find index ${this._indexName}.`);
        }

        QueryOperation.ensureIsAcceptable(result, this._indexQuery.waitForNonStaleResults, duration, this._session);

        this._saveQueryResult(result);
    }

    private _saveQueryResult(result: QueryResult) {
        this._currentQueryResults = result;

        // logging
        const isStale = result.isStale ? " stale " : " ";

        const parameters = new StringBuilder();
        if (this._indexQuery.queryParameters
            && this._indexQuery.queryParameters.length) {
            parameters.append("(parameters: ");

            let first = true;

            const queryParameters = this._indexQuery.queryParameters;
            for (const parameterKey of Object.keys(queryParameters)) {
                const parameterValue = queryParameters[parameterKey];
                if (!first) {
                    parameters.append(", ");
                }

                parameters.append(parameterKey)
                    .append(" = ")
                    .append(parameterValue as any);

                first = false;
            }

            parameters.append(") ");
        }

        log.info("Query '"
            + this._indexQuery.query + "' "
            + parameters.toString()
            + "returned "
            + result.results.length + isStale + "results (total index results: " + result.totalResults + ")");
        // end logging
    }

    public static ensureIsAcceptable(
        result: QueryResult,
        waitForNonStaleResults: boolean,
        duration: Stopwatch | number,
        session: InMemoryDocumentSessionOperations): void {
        if (duration instanceof Stopwatch) {
            duration.stop();
            return QueryOperation.ensureIsAcceptable(result, waitForNonStaleResults, duration.elapsed, session);
        }

        if (waitForNonStaleResults && result.isStale) {
            const msg = "Waited for " + duration.toString() + " for the query to return non stale result.";
            throwError("TimeoutException", msg);
        }
    }

    public get indexQuery(): IndexQuery {
        return this._indexQuery;
    }
}
