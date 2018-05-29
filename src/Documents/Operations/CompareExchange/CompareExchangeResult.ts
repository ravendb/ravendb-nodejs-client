import {DocumentType} from "../../DocumentAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";
import { throwError } from "../../../Exceptions";
import { ClassConstructor } from "../../..";
import { TypeUtil } from "../../../Utility/TypeUtil";

export class CompareExchangeResult<T> {

    public value: T;
    public index: number;
    public successful: boolean;

    public static parseFromString<T>(
        responseString: string, 
        conventions: DocumentConventions, 
        clazz?: ClassConstructor<T>): CompareExchangeResult<T> {

        const response = JsonSerializer.getDefault().deserialize(responseString);

        const index = response["Index"];
        if (!index) {
            throwError("InvalidOperationException", "Response is invalid. Index is missing");
        }

        const successful = response["Successful"];
        const raw = response["Value"];

        let result: T;
        let val = null;

        if (raw) {
            val = raw["Object"];
        }

        if (!val) {
            const emptyExchangeResult = new CompareExchangeResult<T>();
            emptyExchangeResult.index = index;
            emptyExchangeResult.value = null;
            emptyExchangeResult.successful = successful;
            return emptyExchangeResult;
        }

        conventions.tryRegisterEntityType(clazz);

        if (TypeUtil.isPrimitive(val)) {
            result = val;
        } else {
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
