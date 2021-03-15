export interface CounterDetail {
    documentId: string;
    counterName: string;
    totalValue: number;
    etag?: number;
    counterValues?: { [key: string]: number };
    changeVector?: string;
} 
