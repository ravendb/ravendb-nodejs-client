import { ObjectMapper, PascalCasedJsonObjectMapper } from "../Utility/Mapping";

export function getDefaultMapper(): ObjectMapper {
   return new PascalCasedJsonObjectMapper(); 
}
