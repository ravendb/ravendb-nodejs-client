
/**
 *  Counters advanced synchronous session operations
 */
export interface ISessionDocumentCounters extends ISessionDocumentCountersBase {

   /**
    * Returns all the counters for a document.
    */
    getAll(): Promise<{ [key: string]: number }>;

   /**
    * Returns the counter by the counter name.
    */
   get(counter: string): Promise<number>;
   
   /**
    * Returns the map of counter values by counter names
    */
   get(counters: string[]): Promise<{ [key: string]: number }>;
}

/**
 * Counters advanced synchronous session operations
 */
export interface ISessionDocumentCountersBase {

   /**
    * Increments the value of a counter
    */
   increment(counter: string): void;

   /**
    * Increments by delta the value of a counter
    */
   increment(counter: string, delta: number): void;

   /**
    * Marks the specified document's counter for deletion. The counter will be deleted when
    * saveChanges is called.
    */
   delete(counter: string): void;
}
