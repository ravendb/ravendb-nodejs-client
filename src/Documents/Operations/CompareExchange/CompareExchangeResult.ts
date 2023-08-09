import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { throwError } from "../../../Exceptions";
import { TypeUtil } from "../../../Utility/TypeUtil";
import { CompareExchangeResultClass, ServerCasing, ServerResponse } from "../../../Types";
import { COMPARE_EXCHANGE } from "../../../Constants";
import { DocumentType } from "../../DocumentAbstractions";
import { ObjectUtil } from "../../../Utility/ObjectUtil";

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
        response: ServerCasing<ServerResponse<CompareExchangeResultResponse>>,
        conventions: DocumentConventions,
        clazz?: CompareExchangeResultClass<T>): CompareExchangeResult<T> {
        if (!response.Index) {
            throwError("InvalidOperationException", "Response is invalid. Index is missing");
        }

        const val = response.Value.Object || null;
        return CompareExchangeResult._create(val, response.Index, response.Successful, conventions, clazz);
    }

    private static _create<T>(
        val: any,
        index: number,
        successful: boolean,
        conventions: DocumentConventions,
        clazz?: CompareExchangeResultClass<T>): CompareExchangeResult<T> {

        if (clazz) {
            conventions.tryRegisterJsType(clazz as DocumentType);
        }

        if (!val) {
            const emptyExchangeResult = new CompareExchangeResult<T>();
            emptyExchangeResult.index = index;
            emptyExchangeResult.value = null;
            emptyExchangeResult.successful = successful;
            return emptyExchangeResult;
        }

        let result: any = null;
        if (TypeUtil.isPrimitive(val)) {
            result = val as any as T;
        } else {
            let rawValue = val;
            // val comes here with proper key case already
            const entityType = conventions.getJsTypeByDocumentType(clazz as DocumentType);
            if (conventions.entityFieldNameConvention) {
                rawValue = ObjectUtil.transformObjectKeys(
                    rawValue, {
                        defaultTransform: conventions.entityFieldNameConvention,
                        recursive: true,
                        arrayRecursive: true
                    });
            }
            result = conventions.deserializeEntityFromJson(entityType, rawValue) as any as T;
        }

        const exchangeResult = new CompareExchangeResult<T>();
        exchangeResult.index = index;
        exchangeResult.value = result;
        exchangeResult.successful = successful;
        return exchangeResult;
    }
}
