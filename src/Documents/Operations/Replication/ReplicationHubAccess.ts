
export interface ReplicationHubAccess {
    name: string;
    certificateBase64: string;

    allowedHubToSinkPaths?: string[];
    allowedSinkToHubPaths?: string[];
}
