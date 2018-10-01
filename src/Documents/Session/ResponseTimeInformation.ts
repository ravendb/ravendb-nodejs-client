export class ResponseTimeInformation {

    public totalServerDuration: number;
    public totalClientDuration: number;
    public durationBreakdown: ResponseTimeItem[];

    public computeServerTotal(): void {
        this.totalServerDuration =
            this.durationBreakdown.reduce((result, next) => result + next.duration, 0);
    }

    constructor() {
        this.totalServerDuration = 0;
        this.totalClientDuration = 0;
        this.durationBreakdown = [];
    }
}

export interface ResponseTimeItem {
    url: string;
    duration: number;
}
