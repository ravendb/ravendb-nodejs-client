import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";
import { throwError } from "../../../../../Exceptions/index.js";
import { StringUtil } from "../../../../../Utility/StringUtil.js";

/**
 * Represents the version of the Vertex AI API.
 */
export type VertexAIVersion =
    | "V1"
    | "V1_Beta";

/**
 * Settings for Google Vertex AI service.
 */
export class VertexSettings extends AbstractAiSettings {
    /**
     * The model ID for the Vertex AI service.
     */
    public model: string;

    /**
     * The Google Cloud service account credentials in JSON format.
     */
    public googleCredentialsJson: string;

    /**
     * The version of Vertex AI to use.
     */
    public aiVersion?: VertexAIVersion;

    /**
     * The Google Cloud region/location for the Vertex AI service.
     */
    public location: string;

    public constructor(
        model: string,
        googleCredentialsJson: string,
        location: string,
        aiVersion?: VertexAIVersion
    ) {
        super();
        this.model = model;
        this.googleCredentialsJson = googleCredentialsJson;
        this.location = location;
        this.aiVersion = aiVersion;
    }

    /**
     * Extracts the project ID from the Google credentials JSON.
     */
    public getProjectId(): string {
        try {
            const credentials = JSON.parse(this.googleCredentialsJson);
            const projectId = credentials.project_id;

            if (!projectId) {
                throwError("InvalidArgumentException",
                    "Couldn't find project_id in the provided googleCredentialsJson.");
            }

            return projectId;
        } catch (e) {
            if (e.name === "InvalidArgumentException") {
                throw e;
            }
            throwError("InvalidArgumentException",
                `Failed to parse googleCredentialsJson: ${e.message}`);
        }
    }

    public validate(errors: string[]): void {
        if (StringUtil.isNullOrWhitespace(this.model)) {
            errors.push("Value of 'model' field cannot be empty.");
        }

        if (StringUtil.isNullOrWhitespace(this.googleCredentialsJson)) {
            errors.push("Value of 'googleCredentialsJson' field cannot be empty.");
        } else {
            try {
                if (StringUtil.isNullOrWhitespace(this.getProjectId())) {
                    errors.push("Value of 'project_id' field in 'googleCredentialsJson' cannot be empty.");
                }
            } catch (e) {
                errors.push(`Invalid 'googleCredentialsJson': ${e.message}`);
            }
        }

        if (StringUtil.isNullOrWhitespace(this.location)) {
            errors.push("Value of 'location' field cannot be empty.");
        }
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof VertexSettings)) {
            return AiSettingsCompareDifferences.All;
        }

        let differences = AiSettingsCompareDifferences.None;

        if (this.model !== other.model || this.aiVersion !== other.aiVersion) {
            differences |= AiSettingsCompareDifferences.ModelArchitecture;
        }

        if (this.googleCredentialsJson !== other.googleCredentialsJson) {
            differences |= AiSettingsCompareDifferences.AuthenticationSettings;
        }

        if (this.location !== other.location) {
            differences |= AiSettingsCompareDifferences.DeploymentConfiguration;
        }

        return differences;
    }
}
