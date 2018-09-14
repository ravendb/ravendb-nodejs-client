
export interface IndexErrors {
    name: string;
    errors: IndexingError[];
}
 
export interface IndexingError {
    error: string;
    timestamp: Date;
    document: string;
    action: string;
}
