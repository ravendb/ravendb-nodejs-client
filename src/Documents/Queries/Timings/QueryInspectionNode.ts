export interface QueryInspectionNode {
    operation: string;
    parameters: Record<string, string>;
    children: QueryInspectionNode[];
}
