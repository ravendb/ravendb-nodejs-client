 
export default class AggressiveCacheOptions {

    /** duration in milliseconds */
    private _duration: number;

    public get duration() {
        return this._duration;
    }

    public constructor(duration: number) {
        this._duration = duration;
    }
}