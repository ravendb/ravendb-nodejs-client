
export interface FeatureTaskDefinition {
    certificates?: Record<string, string>;
    name: string;
    taskId?: number;
    disabled?: boolean;
}