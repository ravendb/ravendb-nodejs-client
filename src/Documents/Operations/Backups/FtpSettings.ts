import { BackupSettings } from "./BackupSettings";

export interface FtpSettings extends BackupSettings {
    url: string;
    port: number;
    userName: string;
    password: string;
    certificateAsBase64: string;
    certificateFileName: string;
}