import { DocumentConventions, IServerOperation, OperationResultType, RavenCommand, ServerNode } from "../../..";
import { DatabaseAccess } from "./DatabaseAccess";
import { SecurityClearance } from "./SecurityClearance";
import { throwError } from "../../../Exceptions";
import { HttpRequestParameters } from "../../../Primitives/Http";
import { getHeaders } from "../../../Utility/HttpUtil";

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

class PutClientCertificateCommand extends RavenCommand<void> {
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
}
