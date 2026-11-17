export interface RevisionsBinConfiguration {
    disabled?: boolean;
    /**
     * Revisions bin entries older than this are deleted by the cleaner. 0 deletes all of them. Server default: 30 days.
     */
    minimumEntriesAgeToKeepInMin?: number;
    /**
     * Server default: 5 minutes.
     */
    cleanerFrequencyInSec?: number;
}
