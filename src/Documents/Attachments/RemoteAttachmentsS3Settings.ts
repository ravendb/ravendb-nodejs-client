/**
 * Configuration settings for storing remote attachments in Amazon S3 or S3-compatible storage.
 *
 * This class provides the configuration required to upload and store RavenDB attachments in Amazon S3
 * or S3-compatible object storage services.
 *
 * The configuration supports authentication via AWS access keys, secret keys, and optional session tokens
 * for temporary credentials. It also allows customization of storage class, server URL, and path style options
 * for compatibility with various S3-compatible storage providers.
 */
export class RemoteAttachmentsS3Settings {
    /**
     * AWS access key ID used for authentication with Amazon S3.
     *
     * This is the first part of the AWS credentials pair (Access Key ID and Secret Access Key).
     * The access key ID is used to identify the AWS account or IAM user making requests to S3.
     *
     * For security best practices, consider using IAM roles or temporary credentials via
     * awsSessionToken instead of long-term access keys when possible.
     */
    public awsAccessKey: string;

    /**
     * AWS secret access key used for authentication with Amazon S3.
     *
     * This is the second part of the AWS credentials pair (Access Key ID and Secret Access Key).
     * The secret key is used to sign requests to AWS services and should be kept confidential.
     *
     * Security Warning: Never commit secret keys to source control or expose them in logs or error messages.
     * Store them securely using environment variables, configuration management systems, or secret management services.
     */
    public awsSecretKey: string;

    /**
     * AWS session token for temporary security credentials.
     *
     * Session tokens are used when working with temporary security credentials obtained from
     * AWS Security Token Service (STS). These are typically used with IAM roles, federated users,
     * or when assuming roles across AWS accounts.
     *
     * Temporary credentials automatically expire after a specified duration, providing enhanced
     * security compared to long-term access keys. This is the recommended authentication method
     * for production environments.
     */
    public awsSessionToken?: string;

    /**
     * AWS region name where the S3 bucket is located.
     *
     * Examples: "us-east-1", "eu-west-1", "ap-southeast-2"
     * If not specified, the default region will be used.
     */
    public awsRegionName?: string;

    /**
     * The name of the S3 bucket where attachments will be stored.
     *
     * The bucket must already exist and the configured credentials must have permission
     * to write objects to this bucket.
     */
    public bucketName: string;

    /**
     * Optional subfolder path within the S3 bucket for organizing attachments.
     *
     * This property allows you to organize attachments into a specific folder structure within the S3 bucket.
     * For example, you might use different folder names for different databases, environments, or tenants.
     * The folder path can include forward slashes to create a multi-level directory structure.
     *
     * Example: "production/database1" or "attachments/2024"
     */
    public remoteFolderName?: string;

    /**
     * Custom S3 server URL for S3-compatible storage services.
     *
     * Use this when connecting to S3-compatible storage providers like MinIO, Wasabi, DigitalOcean Spaces,
     * or on-premises S3-compatible solutions. Leave undefined for standard AWS S3.
     *
     * Example: "https://s3.wasabisys.com" or "https://nyc3.digitaloceanspaces.com"
     */
    public customServerUrl?: string;

    /**
     * Force path-style requests instead of virtual-hosted-style requests.
     *
     * Path-style: https://s3.amazonaws.com/bucket-name/key
     * Virtual-hosted-style: https://bucket-name.s3.amazonaws.com/key
     *
     * Some S3-compatible services require path-style requests. Set to true for compatibility
     * with these services or when using custom domain names.
     */
    public forcePathStyle?: boolean;

    public isConfigured(): boolean {
        return !!this.bucketName && !!this.awsAccessKey && !!this.awsSecretKey;
    }
}
