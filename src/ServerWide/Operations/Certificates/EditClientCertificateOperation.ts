import { throwError } from "../../../Exceptions/index.js";
import { HttpRequestParameters } from "../../../Primitives/Http.js";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator.js";
import { StringUtil } from "../../../Utility/StringUtil.js";
import { DatabaseAccess } from "./DatabaseAccess.js";
import { SecurityClearance } from "./SecurityClearance.js";
import { SsoIdentifier } from "./SsoIdentifier.js";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions.js";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions.js";
import { RavenCommand } from "../../../Http/RavenCommand.js";
import { IRaftCommand } from "../../../Http/IRaftCommand.js";
import { ServerNode } from "../../../Http/ServerNode.js";
import { JsonSerializer } from "../../../Mapping/Json/Serializer.js";

export class EditClientCertificateOperation implements IServerOperation<void> {
    private readonly _thumbprint: string;
    private readonly _permissions: Record<string, DatabaseAccess>;
    private readonly _name: string;
    private readonly _clearance: SecurityClearance;
    private readonly _disabled: boolean;
    private readonly _ssoServerPublicKeyPinningHashes: string[];
    private readonly _allowAnySsoServer: boolean;
    private readonly _ssoIdentifiers: SsoIdentifier[];

    public constructor(parameters: EditClientCertificateParameters) {
        if (!parameters) {
            throwError("InvalidArgumentException", "Parameters cannot be null");
        }

        if (!parameters.name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        if (!parameters.thumbprint) {
            throwError("InvalidArgumentException", "Thumbprint cannot be null");
        }

        if (!parameters.permissions) {
            throwError("InvalidArgumentException", "Permissions cannot be null");
        }

        if (!parameters.clearance) {
            throwError("InvalidArgumentException", "Clearance cannot be null");
        }

        this._name = parameters.name;
        this._thumbprint = parameters.thumbprint;
        this._permissions = parameters.permissions;
        this._clearance = parameters.clearance;
        this._disabled = parameters.disabled ?? false;
        this._ssoServerPublicKeyPinningHashes = parameters.ssoServerPublicKeyPinningHashes;
        this._allowAnySsoServer = parameters.allowAnySsoServer;
        this._ssoIdentifiers = parameters.ssoIdentifiers;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new EditClientCertificateCommand(this._thumbprint, this._name, this._permissions, this._clearance,
            this._disabled, this._ssoServerPublicKeyPinningHashes, this._allowAnySsoServer, this._ssoIdentifiers);
    }
}

class EditClientCertificateCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _thumbprint: string;
    private readonly _permissions: Record<string, DatabaseAccess>;
    private readonly _name: string;
    private readonly _clearance: SecurityClearance;
    private readonly _disabled: boolean;
    private readonly _ssoServerPublicKeyPinningHashes: string[];
    private readonly _allowAnySsoServer: boolean;
    private readonly _ssoIdentifiers: SsoIdentifier[];

    public constructor(thumbprint: string, name: string, permissions: Record<string, DatabaseAccess>,
        clearance: SecurityClearance, disabled: boolean, ssoServerPublicKeyPinningHashes: string[],
        allowAnySsoServer: boolean, ssoIdentifiers: SsoIdentifier[]) {
        super();

        this._thumbprint = thumbprint;
        this._name = name;
        this._permissions = permissions;
        this._clearance = clearance;
        this._disabled = disabled;
        this._ssoServerPublicKeyPinningHashes = ssoServerPublicKeyPinningHashes;
        this._allowAnySsoServer = allowAnySsoServer;
        this._ssoIdentifiers = ssoIdentifiers;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/certificates/edit";

        // Field names are PascalCased explicitly here (rather than via the default command-payload
        // serializer) so the casing-preserving serializer can be used: the default one would also
        // PascalCase the first letter of every `permissions` key (database names), breaking
        // case-sensitive permission matching (RDBC-1085).
        // The body never carries Usage: the server derives it from the existing certificate.
        const definition: Record<string, unknown> = {
            Thumbprint: this._thumbprint,
            Name: this._name,
            SecurityClearance: this._clearance,
            Disabled: this._disabled,
            Permissions: this._permissions
        };

        // An SSO field is written only when it is provided, so an ordinary edit leaves the stored
        // SSO configuration untouched; an explicitly-empty list is written and clears it.
        if (this._ssoServerPublicKeyPinningHashes != null) {
            definition.SsoServerPublicKeyPinningHashes = this._ssoServerPublicKeyPinningHashes;
        }

        if (this._allowAnySsoServer != null) {
            definition.AllowAnySsoServer = this._allowAnySsoServer;
        }

        if (this._ssoIdentifiers != null) {
            definition.SsoIdentifiers = this._ssoIdentifiers.map(id => {
                const entry: Record<string, string> = {
                    Provider: id.provider,
                    Identifier: id.identifier
                };

                if (!StringUtil.isNullOrEmpty(id.domain)) {
                    entry.Domain = id.domain;
                }

                return entry;
            });
        }

        const body = JsonSerializer.getDefault().serialize(definition);

        return {
            method: "POST",
            uri,
            headers: this._headers().typeAppJson().build(),
            body
        }
    }

    getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}

export interface EditClientCertificateParameters {
    thumbprint: string;
    permissions: Record<string, DatabaseAccess>;
    name: string;
    clearance: SecurityClearance;
    disabled?: boolean;
    ssoServerPublicKeyPinningHashes?: string[];
    allowAnySsoServer?: boolean;
    ssoIdentifiers?: SsoIdentifier[];
}
