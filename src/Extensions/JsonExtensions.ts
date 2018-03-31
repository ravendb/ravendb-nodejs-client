import { ObjectMapper } from "../Utility/Mapping";

export function getDefaultMapper(): ObjectMapper {
    return {
        serialize<T>(obj: T): string {
            return JSON.stringify(obj);
        },
        deserialize<T>(s: string): T {
            return JSON.parse(s) as T;
        }
    };
}