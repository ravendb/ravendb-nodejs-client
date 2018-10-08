import { TcpConnectionStatus } from "./TcpConnectionStatus";

export interface TcpConnectionHeaderResponse {
    status: TcpConnectionStatus;
    message: string;
    version: number;
}
