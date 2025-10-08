import { OpenAiBaseSettings } from "./OpenAiBaseSettings.js";
import { AbstractAiSettings } from "./AbstractAiSettings.js";
import { AiSettingsCompareDifferences } from "../AiSettingsCompareDifferences.js";
import { StringUtil } from "../../../../../Utility/StringUtil.js";

export class AzureOpenAiSettings extends OpenAiBaseSettings {
    /**
     * Azure OpenAI deployment name.
     * Learn more: https://learn.microsoft.com/azure/cognitive-services/openai/how-to/create-resource
     */
    public constructor(
        apiKey: string,
        endpoint: string,
        model: string,
        public deploymentName: string,
        dimensions?: number,
        temperature?: number
    ) {
        super(apiKey, endpoint, model, dimensions, temperature);
    }

    public validate(errors: string[]): void {
        super.validate(errors);

        if (StringUtil.isNullOrEmpty(this.deploymentName?.trim())) {
            errors.push("Value for 'deploymentName' field cannot be empty.");
        }
    }

    public compare(other: AbstractAiSettings): AiSettingsCompareDifferences {
        if (!(other instanceof AzureOpenAiSettings)) {
            return AiSettingsCompareDifferences.All;
        }

        let differences = super.compare(other);

        if (this.deploymentName !== other.deploymentName) {
            differences |= AiSettingsCompareDifferences.DeploymentConfiguration;
        }

        return differences;
    }
}
