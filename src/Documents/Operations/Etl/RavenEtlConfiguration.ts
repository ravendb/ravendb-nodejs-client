import { EtlConfiguration } from "./EtlConfiguration";
import { RavenConnectionString } from "../../..";

export interface RavenEtlConfiguration extends EtlConfiguration<RavenConnectionString> {
    loadRequestTimeoutInSec: number;
}