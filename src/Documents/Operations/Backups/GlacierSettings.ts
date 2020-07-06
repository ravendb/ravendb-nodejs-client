import { AmazonSettings } from "./AmazonSettings";

export interface GlacierSettings extends AmazonSettings {
    vaultName: string;
}