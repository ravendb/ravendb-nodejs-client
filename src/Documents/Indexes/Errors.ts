
export interface IndexErrors {
    name: string;
    errors: IndexingError[];
}
 
export interface IndexingError {
    error: String;
    timestamp: Date;
    document: String;
    action: String;
}
