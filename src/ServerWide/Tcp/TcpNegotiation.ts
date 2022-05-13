import { getLogger } from "../../Utility/LogUtil";
import { Socket } from "net";
import { TcpNegotiateParameters } from "./TcpNegotiateParameters";
import {
    DROP_BASE_LINE,
    getSupportedFeaturesFor, operationVersionSupported,
    SupportedFeatures
} from "./TcpConnectionHeaderMessage";
import { throwError } from "../../Exceptions";

const log = getLogger({ module: "ClusterRequestExecutor" });

export const OUT_OF_RANGE_STATUS = -1;
const DROP_STATUS = -2;

export class TcpNegotiation {
    public static async negotiateProtocolVersion(
        socket: Socket, parameters: TcpNegotiateParameters): Promise<SupportedFeatures> {
        log.info("Start negotiation for " + parameters.operation
            + " operation with " + parameters.destinationNodeTag || parameters.destinationUrl);

        let currentRef: number = parameters.version;
        while (true) {
            await this._sendTcpVersionInfo(socket, parameters, currentRef);
            const version = await parameters.readResponseAndGetVersionCallback(parameters.destinationUrl, socket);

            log.info("Read response from " + (parameters.sourceNodeTag || parameters.destinationUrl)
                + " for " + parameters.operation + ", received version is '" + version + "'");

            if (version === currentRef) {
                break;
            }

            //In this case we usually throw internally but for completeness we better handle it
            if (version === DROP_STATUS) {
                return getSupportedFeaturesFor("Drop", DROP_BASE_LINE);
            }

            const status = operationVersionSupported(parameters.operation, version, x => currentRef = x);
            if (status === "OutOfRange") {
                await this._sendTcpVersionInfo(socket, parameters, OUT_OF_RANGE_STATUS);
                throwError("InvalidArgumentException",
                    "The " + parameters.operation + " version " + parameters.version
                    + " is out of range, our lowest version is " + currentRef);
            }

            log.info("The version " + version + " is " + status + ", will try to agree on '"
             + currentRef + "' for " + parameters.operation + " with "
                + (parameters.destinationNodeTag || parameters.destinationUrl));
        }

        log.info((parameters.destinationNodeTag || parameters.destinationUrl)
            + " agreed on version " + currentRef + " for " + parameters.operation);
        return getSupportedFeaturesFor(parameters.operation, currentRef);
    }

    private static async _sendTcpVersionInfo(socket: Socket,
                                             parameters: TcpNegotiateParameters,
                                             currentVersion: number): Promise<void> {
        log.info("Send negotiation for " + parameters.operation + " in version " + currentVersion);

        const payload = JSON.stringify({
            DatabaseName: parameters.database,
            Operation: parameters.operation,
            SourceNodeTag: parameters.sourceNodeTag,
            OperationVersion: currentVersion,
            AuthorizeInfo: parameters.authorizeInfo || null
        }, null, 0);

        return new Promise<void>((resolve, reject) => {
            socket.write(payload, (err) => {
                err ? reject(err) : resolve();
            });
        });
    }
}
