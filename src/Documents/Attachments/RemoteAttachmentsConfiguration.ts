import { RemoteAttachmentsDestinationConfiguration } from "./RemoteAttachmentsDestinationConfiguration.js";
import { throwError } from "../../Exceptions/index.js";

/**
 * Configuration for remote attachments functionality, including destinations, frequency, and upload settings.
 */
export class RemoteAttachmentsConfiguration {
    /**
     * Dictionary of named remote attachment destinations (case-insensitive keys).
     * Key: destination identifier/name
     * Value: destination configuration
     */
    public destinations: { [key: string]: RemoteAttachmentsDestinationConfiguration };

    /**
     * The frequency (in seconds) at which the remote attachments process checks for new items to upload.
     */
    public checkFrequencyInSec?: number;

    /**
     * The maximum number of items to process in a single batch.
     */
    public maxItemsToProcess?: number;

    /**
     * The number of concurrent uploads allowed.
     */
    public concurrentUploads?: number;

    /**
     * Whether remote attachments functionality is disabled.
     */
    public disabled: boolean;

    constructor() {
        this.destinations = {};
        this.disabled = false;
    }

    /**
     * Checks if this configuration has any valid destination.
     */
    public hasDestination(): boolean {
        if (this.disabled) {
            return false;
        }

        if (!this.destinations || Object.keys(this.destinations).length === 0) {
            return false;
        }

        for (const key of Object.keys(this.destinations)) {
            const destination = this.destinations[key];
            if (destination?.hasUploader()) {
                return true;
            }
        }

        return false;
    }

    /**
     * Validates the entire configuration.
     * @param databaseName Optional database name for error messages
     * @throws Error if configuration is invalid
     */
    public assertConfiguration(databaseName?: string): void {
        const databaseStr = databaseName ? ` for database '${databaseName}'` : "";

        if (this.checkFrequencyInSec !== undefined && this.checkFrequencyInSec <= 0) {
            throwError("InvalidOperationException", `Remote attachments check frequency${databaseStr} must be greater than 0.`);
        }

        if (this.maxItemsToProcess !== undefined && this.maxItemsToProcess <= 0) {
            throwError("InvalidOperationException", `Max items to process${databaseStr} must be greater than 0.`);
        }

        if (this.concurrentUploads !== undefined && this.concurrentUploads <= 0) {
            throwError("InvalidOperationException", `Concurrent attachments uploads${databaseStr} must be greater than 0.`);
        }

        if (!this.destinations || Object.keys(this.destinations).length === 0) {
            // No destinations configured
            return;
        }

        const keys = new Set<string>();
        for (const key of Object.keys(this.destinations)) {
            const destination = this.destinations[key];

            const lowerKey = key.toLowerCase();
            if (keys.has(lowerKey)) {
                throwError("InvalidOperationException", `Destination key '${key}' is duplicate. Duplicate keys are not allowed in remote attachments configuration${databaseStr}.`);
            }
            keys.add(lowerKey);

            if (!destination) {
                throwError("InvalidOperationException", `Destination configuration for key ${key} is null${databaseStr}.`);
            }

            destination.assertConfiguration(key, databaseName);
        }
    }
}
