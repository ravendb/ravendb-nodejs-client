import { SsoProvider } from "./SsoProvider.js";

export interface SsoIdentifier {
    provider: SsoProvider;
    identifier: string;
    domain?: string;
}
