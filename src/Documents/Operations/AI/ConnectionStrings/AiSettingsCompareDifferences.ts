/**
 * Flags enum for detecting differences between AI settings configurations.
 * Uses bitwise operations for combining multiple differences.
 */
export enum AiSettingsCompareDifferences {
    None = 0,
    AuthenticationSettings = 1 << 0,      // 1
    EndpointConfiguration = 1 << 1,       // 2
    ModelArchitecture = 1 << 2,           // 4
    EmbeddingDimensions = 1 << 3,         // 8
    DeploymentConfiguration = 1 << 4,     // 16
    Identifier = 1 << 5,                  // 32
    All = ~(~0 << 6)                      // 63 (all bits set)
}
