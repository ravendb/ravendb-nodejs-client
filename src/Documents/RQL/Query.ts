import {QueryBuilder} from "./QueryBuilder";

export class Query {

  public builder = null;

  constructor(documentType) {

    this.builder = new QueryBuilder();

  }

  public select(fields = null) {
    return this.builder.select(fields).getRql();
  }

  public order(field, direction = 'ASC') {
    this.builder.order(field, direction);
  }

  public whereRaw(rqlText) {
    this.builder.whereRaw(rqlText);
  }

  public whereEquals(field, value) {
    this.builder.where('equals', field, value);
  }

  public whereNotNull(field) {
    this.builder.where('notNull', field);
  }

}
