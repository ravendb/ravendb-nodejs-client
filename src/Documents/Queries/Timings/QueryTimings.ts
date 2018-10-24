import { QueryResult } from "../QueryResult";

export class QueryTimings {
    public durationInMs: number;
    public timings: { [key: string]: QueryTimings };

    public update(queryResult: QueryResult): void {
        this.durationInMs = 0;
        this.timings = null;
        if (!queryResult.timings) {
            return;
        }

        this.durationInMs = queryResult.timings.durationInMs;
        this.timings = queryResult.timings.timings;
    }
}
