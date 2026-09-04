/**
 * Connection settings for Amazon SQS.
 * Exactly one authentication method must be configured:
 * basic credentials or passwordless.
 */
export interface AmazonSqsConnectionSettings {
    /**
     * Basic AWS credentials (access key, secret key, region).
     */
    basic?: AmazonSqsCredentials;

    /**
     * Use the ambient AWS identity (e.g. an IAM role) instead of explicit credentials.
     */
    passwordless?: boolean;
}

export interface AmazonSqsCredentials {
    accessKey: string;
    secretKey: string;
    regionName: string;
}
