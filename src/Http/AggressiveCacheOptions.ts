 
export default class AggressiveCacheOptions {

    /** duration in milliseconds */
    private _duration: number;

    public duration() {
        return this._duration;
    }

    public AggressiveCacheOptions(duration: number) {
        this._duration = duration;
    }
}