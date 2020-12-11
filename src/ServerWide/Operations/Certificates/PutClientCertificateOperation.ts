import { DatabaseAccess } from "./DatabaseAccess";
import { SecurityClearance } from "./SecurityClearance";
import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { getHeaders } from "../../../Utility/HttpUtil";
import { IServerOperation, OperationResultType } from "../../../Documents/Operations/OperationAbstractions";
import { DocumentConventions } from "../../../Documents/Conventions/DocumentConventions";
import { RavenCommand } from "../../../Http/RavenCommand";
import { ServerNode } from "../../../Http/ServerNode";
import { IRaftCommand } from "../../../Http/IRaftCommand";
import { RaftIdGenerator } from "../../../Utility/RaftIdGenerator";

export class PutClientCertificateOperation implements IServerOperation<void> {
    private readonly _certificate: string;
    private readonly _permissions: Record<string, DatabaseAccess>;
    private readonly _name: string;
    private readonly _clearance: SecurityClearance;

    public constructor(name: string, certificate: string, permissions: Record<string, DatabaseAccess>, clearance: SecurityClearance) {
        if (!certificate) {
            throwError("InvalidArgumentException", "Certificate cannot be null");
        }

        if (!permissions) {
            throwError("InvalidArgumentException", "Permissions cannot be null.");
        }

        if (!name) {
            throwError("InvalidArgumentException", "Name cannot be null");
        }

        this._certificate = certificate;
        this._permissions = permissions;
        this._name = name;
        this._clearance = clearance;
    }

    public get resultType(): OperationResultType {
        return "CommandResult";
    }

    getCommand(conventions: DocumentConventions): RavenCommand<void> {
        return new PutClientCertificateCommand(this._name, this._certificate, this._permissions, this._clearance);
    }
}

class PutClientCertificateCommand extends RavenCommand<void> implements IRaftCommand {
    private readonly _certificate: string;
    private readonly _permissions: Record<string, DatabaseAccess>;
    private readonly _name: string;
    private readonly _clearance: SecurityClearance;

    public constructor(name: string,
                       certificate: string,
                       permissions: Record<string, DatabaseAccess>,
                       clearance: SecurityClearance) {
        super();

        if (!certificate) {
            throwError("InvalidArgumentException", "Certificate cannot be null");
        }

        if (!permissions) {
            throwError("InvalidArgumentException", "Permissions cannot be null.");
        }

        this._certificate = certificate;
        this._permissions = permissions;
        this._name = name;
        this._clearance = clearance;
    }

    get isReadRequest(): boolean {
        return false;
    }

    createRequest(node: ServerNode): HttpRequestParameters {
        const uri = node.url + "/admin/certificates";

        const body = this._serializer
            .serialize({
                Name: this._name,
                Certificate: this._certificate,
                SecurityClearance: this._clearance,
                Permissions: this._permissions,

            });

        return {
            uri,
            method: "PUT",
            headers: getHeaders()
                .typeAppJson()
                .build(),
            body
        }
    }

    public getRaftUniqueRequestId(): string {
        return RaftIdGenerator.newId();
    }
}
