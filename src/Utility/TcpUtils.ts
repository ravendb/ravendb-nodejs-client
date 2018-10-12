import * as net from "net";
import { Socket } from "net";
import { URL } from "url";
import { IAuthOptions } from "../Auth/AuthOptions";
import * as tls from "tls";
import { Certificate } from "../Auth/Certificate";
import { PeerCertificate } from "tls";
import { getError } from "../Exceptions";

export class TcpUtils {
    public static async connect(
        urlString: string, serverCertificate: string,
                                clientCertificate: IAuthOptions): Promise<Socket> {
        const url = new URL(urlString);
        const host = url.hostname;
        const port = parseInt(url.port, 10);

        if (serverCertificate && clientCertificate) {
            return new Promise<Socket>((resolve, reject) => {
                const agentOptions = Certificate.createFromOptions(clientCertificate).toAgentOptions();
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
                const socket = tls.connect(port, host, agentOptions, () => {
                    socket.removeListener("error", reject);
                    resolve(socket);
                });

                socket.once("error", reject);
                socket.setNoDelay(true);
            });

        } else {
            return new Promise<Socket>((resolve, reject) => {
                const socket = new net.Socket();
                socket.setNoDelay(true);

                socket.connect(port, host, () => {
                    socket.removeListener("error", reject);
                    resolve(socket);
                });

                socket.once("error", reject);
            });
        }
    }
}
