/**
 * Minimal Bun type definitions for TLS support
 * Based on: https://bun.com/docs/guides/http/tls
 * https://bun.sh/docs/api/tcp
 */

import {BufferSource} from "node:stream/web";

/**
 * TLS options for Bun's fetch API
 */
export interface BunTlsOptions {
    /**
     * Passphrase for the TLS key
     */
    passphrase?: string;

    /**
     * File path to a .pem file custom Diffie Helman parameters
     */
    dhParamsFile?: string;

    /**
     * Explicitly set a server name
     */
    serverName?: string;

    /**
     * This sets `OPENSSL_RELEASE_BUFFERS` to 1.
     * It reduces overall performance but saves some memory.
     * @default false
     */
    lowMemoryMode?: boolean;

    /**
     * If set to `false`, any certificate is accepted.
     * Default is `$NODE_TLS_REJECT_UNAUTHORIZED` environment variable, or `true` if it is not set.
     */
    rejectUnauthorized?: boolean;

    /**
     * If set to `true`, the server will request a client certificate.
     *
     * Default is `false`.
     */
    requestCert?: boolean;

    /**
     * Optionally override the trusted CA certificates. Default is to trust
     * the well-known CAs curated by Mozilla. Mozilla's CAs are completely
     * replaced when CAs are explicitly specified using this option.
     */
    ca?: string | BufferSource | Array<string | BufferSource> | undefined;

    /**
     * Cert chains in PEM format. One cert chain should be provided per
     * private key. Each cert chain should consist of the PEM formatted
     * certificate for a provided private key, followed by the PEM
     * formatted intermediate certificates (if any), in order, and not
     * including the root CA (the root CA must be pre-known to the peer,
     * see ca). When providing multiple cert chains, they do not have to
     * be in the same order as their private keys in key. If the
     * intermediate certificates are not provided, the peer will not be
     * able to validate the certificate, and the handshake will fail.
     */
    cert?: string | BufferSource | Array<string | BufferSource> | undefined;

    /**
     * Private keys in PEM format. PEM allows the option of private keys
     * being encrypted. Encrypted keys will be decrypted with
     * options.passphrase. Multiple keys using different algorithms can be
     * provided either as an array of unencrypted key strings or buffers,
     * or an array of objects in the form {pem: <string|buffer>[,
     * passphrase: <string>]}. The object form can only occur in an array.
     * object.passphrase is optional. Encrypted keys will be decrypted with
     * object.passphrase if provided, or options.passphrase if it is not.
     */
    key?: string | BufferSource | Array<string | BufferSource> | undefined;

    /**
     * Optionally affect the OpenSSL protocol behavior, which is not
     * usually necessary. This should be used carefully if at all! Value is
     * a numeric bitmask of the SSL_OP_* options from OpenSSL Options
     */
    secureOptions?: number | undefined;

    /**
     * ALPN protocols
     */
    ALPNProtocols?: string | BufferSource;

    /**
     * Cipher suite specification
     */
    ciphers?: string;

    /**
     * Client renegotiation limit
     */
    clientRenegotiationLimit?: number;

    /**
     * Client renegotiation window
     */
    clientRenegotiationWindow?: number;

    /**
     * PFX or PKCS12 encoded certificate and private key
     *
     * @warning This property is included for Node.js compatibility, but PFX certificates
     * are NOT currently supported in Bun runtime. Use PEM certificates (cert/key/ca) instead.
     */
    pfx?: Buffer;
}

/**
 * Bun-specific fetch request initialization options
 * Extend standard RequestInit with Bun-specific TLS options
 */
export interface BunFetchRequestInit extends RequestInit {
    /**
     * TLS configuration for HTTPS requests
     */
    tls?: BunTlsOptions;
}
