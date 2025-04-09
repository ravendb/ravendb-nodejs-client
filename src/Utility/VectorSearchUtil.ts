import { IRavenVector } from "../Documents/Session/IVectorFieldFactory.js";

export function RavenVector<T>(vector: IRavenVector<T>): { "@vector": IRavenVector<T> } {
    return {"@vector": vector}
}