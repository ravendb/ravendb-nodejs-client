import {IndexDefinition} from "../src/Database/Indexes/IndexDefinition";
import {FieldIndexingOptions} from "../src/Database/Indexes/FieldIndexingOption";
import {IRavenResponse} from "../src/Database/RavenCommandResponse";
import {IndexFieldOptions} from "../src/Database/Indexes/IndexFieldOptions";
import {IRavenObject} from "../src/Typedef/IRavenObject";
import {PutIndexesOperation} from "../src/Database/Operations/PutIndexesOperation";
import {IDocumentStore} from "../src/Documents/IDocumentStore";

export class Foo implements IRavenObject {
  constructor(
    public id?: string,
    public name: string = "",
    public order: number = 0   
  ) {}        
}

export class Product implements IRavenObject {
  constructor(
    public id?: string,
    public name: string = "",
    public uid?: number,
    public order?: string
  ) {}
}

export class Company implements IRavenObject {
  constructor(
    public id?: string,
    public name: string = "",
    public product?: Product,
    public uid?:number
  ) {}
}

export class Order implements IRavenObject {
  constructor(
    public id?: string,
    public name: string = "",
    public uid?:number,
    public product_id?: string
  ) {}
}

export class LastFm implements IRavenObject {
  constructor(
    public id?: string,
    public artist: string = "",
    public track_id: string = "",
    public title: string = "",
    public datetime_time: Date = new Date(),
    public tags: string[] = [] 
  ) {}
}

export class TestConversion implements IRavenObject {
  constructor(
    public id?: string,
    public date: Date = new Date(),
    public foo?: Foo,
    public foos: Foo[] = []
  ) {}
}

export class TestCustomIdProperty implements IRavenObject {
  constructor(
    public Id: string,
    public Title: string
  ) {}
}

export class LastFmAnalyzed {
  protected indexDefinition: IndexDefinition;

  constructor(
    protected store: IDocumentStore
  ) {
    const indexMap: string = [
      "from song in docs.LastFms ",
      "select new {",
      "query = new object[] {",
      "song.artist,",
      "((object)song.datetime_time),",
      "song.tags,",
      "song.title,",
      "song.track_id}}"
    ].join('');

    this.indexDefinition = new IndexDefinition(
      this.constructor.name, indexMap, null, {
      fields: {
        "query": new IndexFieldOptions(FieldIndexingOptions.Search)
      }
    });
  }

  public async execute(): Promise<IRavenResponse | IRavenResponse[] | void> {
     return this.store.operations.send(new PutIndexesOperation(this.indexDefinition)); 
  }
}

export class ProductsTestingSort {
  protected indexDefinition: IndexDefinition;

  constructor(
    protected store: IDocumentStore
  ) {
    const indexMap: string = [
      'from doc in docs ',
      'select new {',
      'name = doc.name,',
      'uid = doc.uid,',
      'doc_id = doc.uid+"_"+doc.name}'
    ].join('');

    this.indexDefinition = new IndexDefinition('Testing_Sort', indexMap, null, {
      fields: {
        "doc_id": new IndexFieldOptions(null, true)
      }
    });
  }

  public async execute(): Promise<IRavenResponse | IRavenResponse[] | void> {
     return this.store.operations.send(new PutIndexesOperation(this.indexDefinition)); 
  }
}