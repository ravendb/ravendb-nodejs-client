import { QueryResultHighlightings } from "../GenericQueryResult";

/**
 *  Query highlightings for the documents.
 */
export class Highlightings {
    
    private _highlightings: Map<string, string[]>;
    
    private _fieldName: string;

    public constructor(fieldName: string) {
       this._fieldName = fieldName;
       this._highlightings = new Map();
   }

   public get fieldName() {
       return this._fieldName;
   }

   public get resultIndents(): string[] {
       return Object.keys(this._highlightings);
   }
   
   /**
    * @param key  The document id, or the map/reduce key field.
    * @return Returns the list of document's field highlighting fragments.
    */
   public getFragments(key: string): string[] {
       const result = this._highlightings.get(key);
       return result || [];
   }

   public update(highlightings: QueryResultHighlightings): void {
       this._highlightings.clear();
       if (!highlightings || !(this._fieldName in highlightings)) {
           return;
       }

       const result = highlightings[this._fieldName];
       for (const key of Object.keys(result)) {
           this._highlightings.set(key, result[key]);
       }
   }
}
