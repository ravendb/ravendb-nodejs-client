export interface OsInfo {
    type: OSType;
    fullName: string;
    version: string;
    buildVersion: string;
    is64Bit: boolean;
}

export type OSType = "Windows" | "Linux" | "MacOS";
