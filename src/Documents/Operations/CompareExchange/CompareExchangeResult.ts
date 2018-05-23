import {DocumentType} from "../../DocumentAbstractions";
import { DocumentConventions } from "../../Conventions/DocumentConventions";
import { JsonSerializer } from "../../../Mapping/Json/Serializer";
import { throwError } from "../../../Exceptions";
import { ClassConstructor } from "../../..";

export class CompareExchangeResult<T> {

    public value: T;
    public index: number;
    public successful: boolean;

    public static parseFromString<T extends Object>(
        responseString: string, 
        conventions: DocumentConventions, 
        documentType?: DocumentType<T>): CompareExchangeResult<T> {

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

        conventions.tryRegisterEntityType(documentType);

        const entityType = conventions.findEntityType(documentType);
        result = conventions.entityObjectMapper.fromObjectLiteral(val);

        const exchangeResult = new CompareExchangeResult<T>();
        exchangeResult.index = index;
        exchangeResult.value = result;
        exchangeResult.successful = successful;
        return exchangeResult;
    }
}
