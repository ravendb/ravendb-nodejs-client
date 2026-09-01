import { StringUtil } from "../../../../Utility/StringUtil.js";

export interface AzureServiceBusEntraId {
    namespace: string;
    tenantId: string;
    clientId: string;
    clientSecret: string;
}

// machine authentication (Managed Identity)
export interface AzureServiceBusPasswordless {
    namespace: string;
}

export class AzureServiceBusConnectionSettings {
    public connectionString?: string;
    public entraId?: AzureServiceBusEntraId;
    public passwordless?: AzureServiceBusPasswordless;

    public isValidConnection(): boolean {
        if (!this.isOnlyOneConnectionProvided()) {
            return false;
        }

        if (this.isEntraIdValid()) {
            return true;
        }

        if (this.isPasswordlessValid()) {
            return true;
        }

        // shallow check; the Azure SDK produces the authoritative error at connect time
        return !StringUtil.isNullOrEmpty(this.connectionString)
            && this.connectionString.toLowerCase().includes("sb://");
    }

    // presence-based: an EntraId/Passwordless object counts even with all fields empty;
    // a ConnectionString counts only when non-whitespace
    private isOnlyOneConnectionProvided(): boolean {
        let count = 0;

        if (this.entraId != null) {
            count++;
        }

        if (!StringUtil.isNullOrWhitespace(this.connectionString)) {
            count++;
        }

        if (this.passwordless != null) {
            count++;
        }

        return count === 1;
    }

    private isEntraIdValid(): boolean {
        return !!this.entraId
            && !StringUtil.isNullOrWhitespace(this.entraId.namespace)
            && !StringUtil.isNullOrWhitespace(this.entraId.tenantId)
            && !StringUtil.isNullOrWhitespace(this.entraId.clientId)
            && !StringUtil.isNullOrWhitespace(this.entraId.clientSecret);
    }

    private isPasswordlessValid(): boolean {
        return !!this.passwordless
            && !StringUtil.isNullOrWhitespace(this.passwordless.namespace);
    }
}
