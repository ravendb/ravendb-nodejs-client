import { EtlConfiguration } from "../Etl/EtlConfiguration.js";
import { AiConnectionString, AiConnectorType } from "./ConnectionStrings/index.js";

export abstract class AbstractAiIntegrationConfiguration extends EtlConfiguration<AiConnectionString> {
    public get aiConnectorType(): AiConnectorType {
        return this.connection?.getActiveProvider() ?? "None";
    }

    /**
     * Reference to the initialized connection string.
     * Set during configuration initialization.
     */
    public connection?: AiConnectionString;

    /**
     * Test mode flag - when true, some validations may be skipped.
     */
    public testMode: boolean = false;
}


