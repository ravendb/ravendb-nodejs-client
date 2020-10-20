import { ILazyOperation } from "./ILazyOperation";
import { ClusterTransactionOperationsBase } from "../../ClusterTransactionOperationsBase";
import {
    ClassConstructor,
    CompareExchangeValueResultParser,
    DocumentConventions,
    QueryResult
} from "../../../..";
import { throwError } from "../../../../Exceptions";
import { GetRequest } from "../../../Commands/MultiGet/GetRequest";
import { GetResponse } from "../../../Commands/MultiGet/GetResponse";
import { TypeUtil } from "../../../../Utility/TypeUtil";
import { RavenCommandResponsePipeline } from "../../../../Http/RavenCommandResponsePipeline";
import { stringToReadable } from "../../../../Utility/StreamUtil";
import { GetCompareExchangeValuesResponse } from "../../../Operations/CompareExchange/CompareExchangeValueResultParser";

export class LazyGetCompareExchangeValueOperation<T extends object> implements ILazyOperation {
    private readonly _clusterSession: ClusterTransactionOperationsBase;
    private readonly _clazz: ClassConstructor<T>;
    private readonly _conventions: DocumentConventions;
    private readonly _key: string;

    private _result: object;
    private _requiresRetry: boolean;

    public constructor(clusterSession: ClusterTransactionOperationsBase, clazz: ClassConstructor<T>,
                       conventions: DocumentConventions, key: string) {
        if (!clusterSession) {
            throwError("InvalidArgumentException", "Cluster Session cannot be null");
        }
        if (!conventions) {
            throwError("InvalidArgumentException", "Conventions cannot be null");
        }
        if (!key) {
            throwError("InvalidArgumentException", "Key cannot be null");
        }

        this._clusterSession = clusterSession;
        this._clazz = clazz;
        this._conventions = conventions;
        this._key = key;
    }

    public get result() {
        return this._result;
    }

    public get queryResult(): QueryResult {
        throwError("NotImplementedException", "Not implemented");
        return null;
    }

    public get requiresRetry() {
        return this._requiresRetry;
    }

    createRequest(): GetRequest {
        if (this._clusterSession.isTracked(this._key)) {
            this._result = this._clusterSession.getCompareExchangeValueFromSessionInternal<T>(this._key, TypeUtil.NOOP, this._clazz);
            return null;
        }

        const request = new GetRequest();
        request.url = "/cmpxchg";
        request.method = "GET";
        request.query = "?key=" + encodeURIComponent(this._key);

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

            const value = CompareExchangeValueResultParser.getValue(results, false, this._conventions, null);

            if (this._clusterSession.session.noTracking) {
                if (!value) {
                    this._result = this._clusterSession.registerMissingCompareExchangeValue(this._key).getValue(this._clazz, this._conventions);
                    return;
                }

                this._result = this._clusterSession.registerCompareExchangeValue(value).getValue(this._clazz, this._conventions);
                return;
            }

            if (value) {
                this._clusterSession.registerCompareExchangeValue(value);
            }
        }

        if (!this._clusterSession.isTracked(this._key)) {
            this._clusterSession.registerMissingCompareExchangeValue(this._key);
        }

        this._result = this._clusterSession.getCompareExchangeValueFromSessionInternal(this._key, TypeUtil.NOOP, this._clazz);
    }
}
