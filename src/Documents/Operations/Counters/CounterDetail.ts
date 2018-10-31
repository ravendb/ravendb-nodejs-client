export class CounterDetail {
    public documentId: string;
    public counterName: string;
    public totalValue: number;
    public etag: number;
    public counterValues: { [key: string]: number };
    public changeVector: string;
} 
