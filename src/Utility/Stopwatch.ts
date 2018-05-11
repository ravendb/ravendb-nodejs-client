
import * as moment from "moment";

export class Stopwatch {

    private startDate: Date;
    private endDate: Date;

    public start() {
        this.startDate = new Date();
    }

    public stop() {
        this.endDate = new Date();
    }

    public static createStarted() {
        const s = new Stopwatch();
        s.start();
        return s;
    }

}