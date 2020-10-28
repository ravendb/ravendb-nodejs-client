import { ILazyOperation } from "./ILazyOperation";
import { ClusterTransactionOperationsBase } from "../../ClusterTransactionOperationsBase";
import { ClassConstructor } from "../../../../Types";
import { throwError } from "../../../../Exceptions";
import { TypeUtil } from "../../../../Utility/TypeUtil";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import StringBuilder = require("string-builder");
import { StringUtil } from "../../../../Utility/StringUtil";
import { RavenCommandResponsePipeline } from "../../../../Http/RavenCommandResponsePipeline";
import {
    CompareExchangeValueResultParser,
    GetCompareExchangeValuesResponse
} from "../../../Operations/CompareExchange/CompareExchangeValueResultParser";
import { stringToReadable } from "../../../../Utility/StreamUtil";
import { DocumentConventions } from "../../../Conventions/DocumentConventions";
import { QueryResult } from "../../../Queries/QueryResult";
import { CompareExchangeValue } from "../../../Operations/CompareExchange/CompareExchangeValue";

export class LazyGetCompareExchangeValuesOperation<T extends object> implements ILazyOperation {
    private readonly _clusterSession: ClusterTransactionOperationsBase;
    private readonly _clazz: ClassConstructor<T>;
    private readonly _conventions: DocumentConventions;
    private readonly _startsWith: string;
    private readonly _start: number
    private readonly _pageSize: number;
    private readonly _keys: string[];
    private _result: object;
    private _requiresRetry: boolean;


    public constructor(clusterSession: ClusterTransactionOperationsBase,
                       clazz: ClassConstructor<T>,
                       conventions: DocumentConventions,
                       keys: string[]);
    public constructor(clusterSession: ClusterTransactionOperationsBase,
                       clazz: ClassConstructor<T>,
                       conventions: DocumentConventions,
                       startsWith: string,
                       start: number,
                       pageSize: number);
    public constructor(clusterSession: ClusterTransactionOperationsBase,
                       clazz: ClassConstructor<T>,
                       conventions: DocumentConventions,
                       keysOrStartsWith: string | string[],
                       start?: number,
                       pageSize?: number) {
        if (!clusterSession) {
            throwError("InvalidArgumentException", "ClusterSession cannot be null");
        }
        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }

        this._clusterSession = clusterSession;
        this._clazz = clazz;
        this._conventions = conventions;

        if (TypeUtil.isArray<string>(keysOrStartsWith)) {
            this._keys = keysOrStartsWith;

            this._start = 0;
            this._pageSize = 0;
            this._startsWith = null;
        } else {
            this._startsWith = keysOrStartsWith;
            this._start = start;
            this._pageSize = pageSize;

            this._keys = null;
        }
    }

    get result() {
        return this._result;
    }

    get queryResult(): QueryResult {
        throwError("NotImplementedException");
        return null;
    }

    get requiresRetry() {
        return this._requiresRetry;
    }

    createRequest(): GetRequest {
        let pathBuilder: StringBuilder;

        if (this._keys) {
            for (const key of this._keys) {
                if (this._clusterSession.isTracked(key)) {
                    continue;
                }

                if (!pathBuilder) {
                    pathBuilder = new StringBuilder("?");
                }

                pathBuilder.append("&key=").append(encodeURIComponent(key));
            }
        } else {
            pathBuilder = new StringBuilder("?");

            if (StringUtil.isNullOrEmpty(this._startsWith)) {
                pathBuilder.append("&startsWith=").append(encodeURIComponent(this._startsWith));
            }

            pathBuilder.append("&start=").append((this._start || 0).toString());
            pathBuilder.append("&pageSize=").append((this._pageSize || 0).toString());
        }

        if (!pathBuilder) {
            this._result = this._clusterSession.getCompareExchangeValuesFromSessionInternal(this._keys, TypeUtil.NOOP, this._clazz);
            return null;
        }

        const request = new GetRequest();
        request.url = "/cmpxchg";
        request.method = "GET";
        request.query = pathBuilder.toString();

        return request;
    }

    async handleResponseAsync(response: GetResponse): Promise<void> {
        if (response.forceRetry) {
            this._result = null;
            this._requiresRetry = true;
            return;
        }

        if (response.result) {
            const results = await RavenCommandResponsePipeline.create<GetCompareExchangeValuesResponse>()
                .parseJsonAsync()
                .jsonKeysTransform("GetCompareExchangeValue", this._conventions)
                .process(stringToReadable(response.result));

            if (this._clusterSession.session.noTracking) {
                const result: { [key: string]: CompareExchangeValue<T> } = {};
                for (const kvp of Object.entries(CompareExchangeValueResultParser.getValues(results, false, this._conventions))) {
                    if (!kvp[1].value) {
                        result[kvp[0]] = this._clusterSession.registerMissingCompareExchangeValue(kvp[0]).getValue(this._clazz, this._conventions);
                        continue;
                    }

                    result[kvp[0]] = this._clusterSession.registerCompareExchangeValue(kvp[1]).getValue(this._clazz, this._conventions);
                }

                this._result = result;
                return;
            }

            for (const kvp of Object.entries(CompareExchangeValueResultParser.getValues(results, false, this._conventions))) {
                if (!kvp[1]) {
                    continue;
                }

                this._clusterSession.registerCompareExchangeValue(kvp[1]);
            }
        }

        if (this._keys) {
            for (const key of this._keys) {
                if (this._clusterSession.isTracked(key)) {
                    continue;
                }

                this._clusterSession.registerMissingCompareExchangeValue(key);
            }
        }

        this._result = this._clusterSession.getCompareExchangeValuesFromSessionInternal(this._keys, TypeUtil.NOOP, this._clazz);
    }
}

