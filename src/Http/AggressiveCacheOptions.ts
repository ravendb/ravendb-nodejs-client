/**
 * TrackChanges drops cached responses when the Changes API reports a change; DoNotTrackChanges
 * serves them until the duration passes.
 */
export type AggressiveCacheMode = "TrackChanges" | "DoNotTrackChanges";

export class AggressiveCacheOptions {
    public duration: number;
    public mode: AggressiveCacheMode;

    public constructor(duration: number, mode: AggressiveCacheMode) {
        this.duration = duration;
        this.mode = mode;
    }
}
