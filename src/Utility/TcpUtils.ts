import * as net from "net";
import { Socket } from "net";
import { URL } from "url";
import { IAuthOptions } from "../Auth/AuthOptions";
import * as tls from "tls";
import { Certificate } from "../Auth/Certificate";

export class TcpUtils {
    public static async connect(urlString: string, serverCertificate: string,
                                clientCertificate: IAuthOptions): Promise<Socket> {
        const url = new URL(urlString);
        const host = url.hostname;
        const port = parseInt(url.port, 10);

        if (serverCertificate && clientCertificate) {
            return new Promise<Socket>((resolve, reject) => {
                const agentOptions = Certificate.createFromOptions(clientCertificate).toAgentOptions();
                agentOptions.ca = serverCertificate; //TODO: it works even when we pass invalid ca cert!
                const socket = tls.connect(port, host, agentOptions, () => {
                    socket.removeListener("error", reject);
                    resolve(socket);
                });
                socket.setNoDelay(true);
                socket.once("error", reject);
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
