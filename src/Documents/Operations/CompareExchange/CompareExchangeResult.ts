import {DocumentConventions} from "../../Conventions/DocumentConventions";
import {throwError} from "../../../Exceptions";
import {ClassConstructor} from "../../..";
import {TypeUtil} from "../../../Utility/TypeUtil";

export interface CompareExchangeResultResponse {
    index: number;
    successful: boolean;
    value: {
        object: object
    };
}

export class CompareExchangeResult<T> {

    public value: T;
    public index: number;
    public successful: boolean;

    public static parseFromObject<T>(
        {index, value, successful}: CompareExchangeResultResponse,
        conventions: DocumentConventions,
        clazz?: ClassConstructor<T>): CompareExchangeResult<T> {
        if (!index) {
            throwError("InvalidOperationException", "Response is invalid. Index is missing");
        }

        const val = value.object || null;
        return CompareExchangeResult._create(val, index, successful, conventions, clazz);
    }

    public static parseFromString<T>(
        responseString: string,
        conventions: DocumentConventions,
        clazz?: ClassConstructor<T>): CompareExchangeResult<T> {

        const response = JSON.parse(responseString);

        const index = response["Index"];
        if (!index) {
            throwError("InvalidOperationException", "Response is invalid. Index is missing");
        }

        const successful = response["Successful"];
        const raw = response["Value"];

        let val = null;

        if (raw) {
            val = raw["Object"];
        }

        return CompareExchangeResult._create(val, index, successful, conventions, clazz);
    }

    private static _create<T>(
        val: any,
        index: number,
        successful: boolean,
        conventions: DocumentConventions,
        clazz?: ClassConstructor<T>): CompareExchangeResult<T> {

        conventions.tryRegisterEntityType(clazz);

        if (!val) {
            const emptyExchangeResult = new CompareExchangeResult<T>();
            emptyExchangeResult.index = index;
            emptyExchangeResult.value = null;
            emptyExchangeResult.successful = successful;
            return emptyExchangeResult;
        }

        let result: T;
        if (TypeUtil.isPrimitive(val)) {
            result = val as any as T;
        } else {
            // val comes here with proper key case already
            const entityType = conventions.findEntityType(clazz);
            result = conventions.deserializeEntityFromJson(entityType, val) as any as T;
        }

        const exchangeResult = new CompareExchangeResult<T>();
        exchangeResult.index = index;
        exchangeResult.value = result;
        exchangeResult.successful = successful;
        return exchangeResult;
    }
}
