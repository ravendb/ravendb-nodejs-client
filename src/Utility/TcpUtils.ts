
import { Socket } from "node:net";
import { IAuthOptions } from "../Auth/AuthOptions.js";
import { Certificate } from "../Auth/Certificate.js";
import { PeerCertificate } from "node:tls";
import { getError, throwError } from "../Exceptions/index.js";
import { TcpConnectionInfo } from "../ServerWide/Commands/GetTcpInfoCommand.js";
import { OperationTypes, SupportedFeatures } from "../ServerWide/Tcp/TcpConnectionHeaderMessage.js";

export class TcpUtils {
    public static async connect(
        urlString: string,
        serverCertificate: string,
        clientCertificate: IAuthOptions,
        timeout?: number): Promise<Socket> {
        const socket = await TcpUtils._openSocket(urlString, serverCertificate, clientCertificate);

        if (timeout) {
            socket.setTimeout(timeout, () => socket.destroy(getError("TimeoutException",
                "No data was sent or received over the TCP connection to " + urlString + " for " + timeout + " ms.")));
        }

        return socket;
    }

    private static async _openSocket(
        urlString: string,
        serverCertificate: string,
        clientCertificate: IAuthOptions): Promise<Socket> {
        const url = new URL(urlString);
        const host = url.hostname;
        const port = Number.parseInt(url.port, 10);

        if (serverCertificate && clientCertificate) {
            const { connect } = await import("node:tls");

            return new Promise<Socket>((resolve, reject) => {
                const agentOptions = Certificate.createFromOptions(clientCertificate).toSocketOptions();
                agentOptions.checkServerIdentity = (host: string, peerCertificate: PeerCertificate) => {
                    const remoteCert = peerCertificate.raw;
                    const expectedCert = Buffer.from(serverCertificate, "base64");
                    let sameCert = true;
                    if (remoteCert.length !== expectedCert.length) {
                        sameCert = false;
                    }
                    
                    for (let i = 0; i < remoteCert.length; i++) {
                        if (remoteCert[i] !== expectedCert[i]) {
                            sameCert = false;
                            break;
                        }
                    }

                    if (!sameCert) {
                        return getError("AuthenticationException", "Invalid server certificate.");
                    }
                };
                const socket = connect(port, host, agentOptions, () => {
                    socket.removeListener("error", reject);
                    resolve(socket);
                });

                socket.once("error", reject);
                socket.setNoDelay(true);
            });

        } else {
            const { Socket } = await import("node:net");

            return new Promise<Socket>((resolve, reject) => {
                const socket = new Socket();
                socket.setNoDelay(true);

                socket.connect(port, host, () => {
                    socket.removeListener("error", reject);
                    resolve(socket);
                });

                socket.once("error", reject);
            });
        }
    }

    public static async connectSecuredTcpSocket(info: TcpConnectionInfo, serverCertificate: string,
                                            clientCertificate: IAuthOptions, operationType: OperationTypes, negotiationCallback: NegotiationCallback,
                                            timeout?: number): Promise<ConnectSecuredTcpSocketResult> {
        if (info.urls) {
            for (const url of info.urls) {
                try {
                    const socket = await this.connect(url, serverCertificate, clientCertificate, timeout);
                    const supportedFeatures = await this._invokeNegotiation(info, operationType, negotiationCallback, url, socket);
                    return new ConnectSecuredTcpSocketResult(url, socket, supportedFeatures);
                } catch {
                    // ignored
                }
            }
        }

        const socket = await this.connect(info.url, serverCertificate, clientCertificate, timeout);
        const supportedFeatures = await this._invokeNegotiation(info, operationType, negotiationCallback, info.url, socket);
        return new ConnectSecuredTcpSocketResult(info.url, socket, supportedFeatures);
    }

    private static _invokeNegotiation(info: TcpConnectionInfo, operationType: OperationTypes, negotiationCallback: NegotiationCallback, url: string, socket: Socket) {
        switch (operationType) {
            case "Subscription": {
                return negotiationCallback(url, info, socket);
            }
            default: {
                throwError("NotSupportedException", "Operation type '" + operationType + "' not supported");
            }
        }
    }
}

type NegotiationCallback = (url: string, info: TcpConnectionInfo, socket: Socket) => Promise<SupportedFeatures>;

export class ConnectSecuredTcpSocketResult {
    url: string;
    socket: Socket;
    supportedFeatures: SupportedFeatures;


    constructor(url: string, socket: Socket, supportedFeatures: SupportedFeatures) {
        this.url = url;
        this.socket = socket;
        this.supportedFeatures = supportedFeatures;
    }
}
