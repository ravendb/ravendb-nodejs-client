import { EncryptionMode } from "./Enums";

export interface BackupEncryptionSettings {
    key: string;
    encryptionMode: EncryptionMode;
}