export class Stopwatch {

    private _startDate: Date;
    private _endDate: Date;

    public start() {
        this._startDate = new Date();
    }

    public stop() {
        this._endDate = new Date();
    }

    public get elapsed(): number {
        if (!this._startDate) {
            return 0;
        }

        if (!this._endDate) {
            return new Date().valueOf() - this._startDate.valueOf();
        }

        return this._endDate.valueOf() - this._startDate.valueOf();
    }

    public static createStarted() {
        const s = new Stopwatch();
        s.start();
        return s;
    }

}
