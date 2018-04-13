import { ClassConstructor } from "../Types";
import { throwError } from "../Exceptions";
import { DocumentInfo } from "../Documents/Session/DocumentInfo";
import { JsonSerializer } from "./Json";
import { TypesAwareObjectMapper } from "./ObjectMapper";

// export interface IEntityMapper<TResult extends object> {
//     deserialize(json: string, metadata: object): TResult;
//     deserialize(json: string, metadata: object): object;

//     serialize(obj: object): string;
// }

// export class EntityJsonSerializer<TResult extends object> implements IEntityMapper<TResult> {


//     public constructor(jsonParser: JsonSerializer, objectMapper: TypesAwareObjectMapper) {
//         this._jsonParser = jsonParser;
//         this._objectMapper = objectMapper;
//     }

//     public serialize(raw: object, documentInfo: DocumentInfo): TResult;
//     public serialize(raw: any, documentInfo: DocumentInfo): object {
//         throw new Error("Method not implemented.");
//     }

//     public 
// }



