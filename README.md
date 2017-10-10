# RavenDB node.js client

## Installation

```bash
npm install --save ravendb
```

## Getting started

1. Require `DocumentStore` class from package
```javascript
const {DocumentStore} = require('ravendb');
```
or
```javascript
const DocumentStore = require('ravendb').default;
```
or (using ES6 / Typescript imports)
```javascript
import DocumentStore from 'ravendb';
```
2. Initialize document store (this can be kept as a global object)
```javascript
const store = DocumentStore.create('database url', 'default database name');
store.initialize();
```
3. Open a session
```javascript
const session = store.openSession();
```
4. Call `saveChanges()` when you'll finish working with a session
```javascript
session
 .load('Users/1')
 .then((user) => {
   user.password = md5('new password');

   return session.store(user);
 })
 .then(() => session.saveChanges())
 .then(() => {
    // here you can finish request
  });
```

## Supported asynchronous call types
1. You can use callbacks
```javascript
session
 .load('Users/1', null, [], {}, (user) => {
   user.password = md5('new password');

   session.store(user, null, null, null, () => {
     session.saveChanges(() => {
       // here session is complete
     });
   });
 })
```

2. You can use promises as well
```javascript
session
 .load('Users/1')
 .then((user) => {
   user.password = md5('new password');

   return session.store(user);
 })
 .then(() => session.saveChanges())
 .then(() => {
    // here session is complete
  });
```

3. With `co` library or frameworks using it (such as `AdonisJS`) you can `yield` calls
```javascript
const co = require('co');

// ...

co(function * () {
  session = store.openSession();

  let user = yield store.load('Users/1');
  
  user.password = md5('new password');
  yield session.store(user);

  yield session.saveChanges();

  // here session is complete
});
```
4. Also client is supporting `async` / `await` stuff 
```javascript
async () => {
  session = store.openSession();

  let user = await store.load('Users/1');
  
  user.password = md5('new password');
  await session.store(user);

  await session.saveChanges();

  // here session is complete
})
```
## CRUD example

### Creating documents
```javascript
let product = {
  title: 'iPhone X',
  price: 999.99,
  currency: 'USD',
  storage: 64,
  manufacturer: 'Apple',
  in_stock: true,
  last_update: new Date('2017-10-01T00:00:00')
};

product = await session.store(product, 'Products/');
console.log(product.id); // will output Products/<some number> e.g. Products/1
await session.saveChanges();
```

### Loading documents
```javascript
product = await session.load('Products/1');
console.log(product.title); // iPhone X
console.log(product.id); // Products/1
```
### Updating documents
```javascript
product = await session.load('Products/1');
product.in_stock = false;
product.last_update = new Date();
await session.store(product);
await session.saveChanges();

product = await session.load('Products/1');
console.log(product.in_stock); // false
console.log(product.last_update); // outputs current date
```
### Deleting documents
```javascript
product = await session.load('Products/1');
await session.delete(product);
// or you can just do
// await session.delete('Products/1');
await session.saveChanges();

product = await session.load('Products/1');
console.log(product); // undefined
```
## Querying documents
1. Create `DocumentQuery` instance using `query()` method of session:
```javascript
query = session.query({
  documentType: 'Product', // specify which collection you'd like to query
  // optionally you may specify an index name for querying
  // indexName: 'PopularProductsWithViewsCount'
});
```
2. Apply conditions, ordering etc. Query supports chaining calls:
```javascript
const {DocumentStore, QueryOperators} = require('ravendb');

// ...

query
  .usingDefaultOperator(QueryOperators.And)
  .whereEquals('manufacturer', 'Apple')
  .whereEquals('in_stock', true)
  .whereBetween('last_update', new Date('2017-10-01T00:00:00'), new Date())
  .orderBy('price');
```
3. Finally, you may get query results:
```
let documents = await query.all();
```

#### DocumentQuery methods overview
| Method | RQL / description |
| ------------- | ------------- |
|selectFields(fields: string[], projections?: string[]): this;|SELECT field1 [AS projection1], ...|
|distinct(): this;|SELECT DISTINCT|
|whereEquals<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): this;|WHERE fieldName = <value>|
|whereNotEquals<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): this;|WHERE fieldName != <value>|
|whereIn<V extends ConditionValue>(fieldName: string, values: V[], exact?: boolean): this;|WHERE fieldName IN (<value1>, <value2>, ...)|
|whereStartsWith<V extends ConditionValue>(fieldName: string, value: V): this;|WHERE startsWith(fieldName, '<value>')|
|whereEndsWith<V extends ConditionValue>(fieldName: string, value: V): this;|WHERE endsWith(fieldName, '<value>')|
|whereBetween<V extends ConditionValue>(fieldName: string, start: V, end: V, exact?: boolean): this;|WHERE fieldName BETWEEN <start> AND <end>|
|whereGreaterThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): this;|WHERE fieldName > <value>|
|whereGreaterThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): this;|WHERE fieldName >= <value>|
|whereLessThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): this;|WHERE fieldName < <value>|
|whereLessThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): this;|WHERE fieldName <= <value>|
|whereExists(fieldName: string): this;|WHERE exists(fieldName)|
|containsAny<V extends ConditionValue>(fieldName: string, values: V[]): this;|WHERE fieldName IN (<value1>, <value2>, ...)|
|containsAll<V extends ConditionValue>(fieldName: string, values: V[]): this;|WHERE fieldName ALL IN (<value1>, <value2>, ...)|
|search(fieldName: string, searchTerms: string, operator?: SearchOperator): this;|Performs full-text search|
|openSubclause(): this;|Opens subclause (|
|closeSubclause(): this;|Closes subclause )|
|negateNext(): this;|Adds NOT before next condition|
|andAlso(): this;|Adds AND before next condition|
|orElse(): this;|Adds OR before next condition|
|usingDefaultOperator(operator: QueryOperator): this;|Sets default operator (which will be used if no andAlso() / orElse was called. Just after query instantiation, OR is used as default operator. Default operator can be changed only adding any conditions|
|orderBy(field: string, ordering?: OrderingType): this;|ORDER BY field [DESC]|
|randomOrdering(seed?: string): this;|ORDER BY random()|
|take(count: number): this;|Limits the number of result entries to *count* |
|skip(count: number): this;|Skips first *count* results |
|first(callback?: EntityCallback<T>): Promise<T>;|Returns first document from result set|
|single(callback?: EntityCallback<T>): Promise<T>;|Returns single document matching query criteria. If there are no such document or more then one - throws an Exception|
|all(callback?: QueryResultsCallback<T[]>): Promise<T[]>;|Returns all documents from result set (considering take() / skip() options)|
|count(callback?: EntitiesCountCallback): Promise<number>;|Returns count of all documents matching query criteria (non-considering take() / skip() options)|

Condition value can be a string, number, boolean, null value or `Date` object:

```
type ConditionValue = string | number | boolean | Date | null;
```

## Using ECMAScript 2015 classes as models instead of object literals

1. Define your model as class. Attributes should be just public properties:
```javascript
class Product {
  constructor(
    id = null,
    title = '',
    price = 0,
    currency = 'USD',
    storage = 0,
    manufacturer = '',
    in_stock = false,
    last_update = null
  ) {
    Object.assign(this, {
      title, 
      price, 
      currency,
      storage, 
      manufacturer, 
      in_stock, 
      last_update: last_update || new Date()
    });  
  }
}
```
2. For store model just pass it's instance without specifying collection prefix (e.g. `Products/`). Collection name will be detected automatically by model's class name
```javascript
let product = new Product(
  null, 'iPhone X', 999.99, 'USD', 64, 'Apple', true,
   new Date('2017-10-01T00:00:00')
};

product = await session.store(product);
console.log(product instanceof Product); // true
console.log(product.id.includes('Products/')); // true
await session.saveChanges();
```
3. When loading document, pass class constructor as second parameter of `session.load()`:
```javascript
let product = await session.load('Products/1', Product);
console.log(product instanceof Product); // true
console.log(product.id); // Products/1
```
4. When querying documents, pass class constructor to `documentType` option of `session.query({  ... })`:
```javascript
let products = await session.query({ documentType: Product }).all();

products.forEach((product) => {
  console.log(product instanceof Product); // true
  console.log(product.id.includes('Products/')); // true
});
```

Also you can set global models class resolver (something like class autoloader in PHP). It should be a callback function accepting a name of the model class and returning its constructor:

```javascript
store.conventions.addDocumentInfoResolver({
  resolveConstructor: (className) =>
    require(`./relative/path/to/models/${className}`)
});

session = store.openSession();

let product = await session.load('Products/1');
console.log(product instanceof Product); // true
console.log(product.id); // Products/1

let products = await session.query({ documentType: 'Product' }).all();

products.forEach((product) => {
  console.log(product instanceof Product); // true
  console.log(product.id.includes('Products/')); // true
});
``` 

## Usage with TypeScript

All datatype definitions you can find in `lib/ravendb-node.d.ts`. An example of CRUD operations and querying documents you may find below:

```typescript

// file models/Product.ts

export class Product {
  constructor(
    public id: string = null,
    public title: string = '',
    public price: number = 0,
    public currency: string = 'USD',
    public storage: number = 0,
    public manufacturer: string = '',
    public in_stock: boolean = false,
    public last_update: Date = null
  ) {}
}

export default Product;

// file app.ts
import {DocumentStore, IDocumentStore, IDocumentSession, IDocumentQuery, DocumentConstructor, QueryOperators} from 'ravendb';

const store: IDocumentStore = DocumentStore.create('database url', 'database name');
let session: IDocumentSession;

store.initialize();
store.conventions.addDocumentInfoResolver({
  resolveConstructor: (typeName: string): DocumentConstructor =>
    <DocumentConstructor>require(`./models/${typeName}`)
});

(async (): Promise<void> => {
  let product: Product = new Product(
    null, 'iPhone X', 999.99, 'USD', 64, 'Apple', true, new Date('2017-10-01T00:00:00'));

  product = await session.store<Product>(product);
  console.log(product instanceof Product); // true
  console.log(product.id.includes('Products/')); // true
  await session.saveChanges();

  product = await session.load<Product>('Products/1');
  console.log(product instanceof Product); // true
  console.log(product.id); // Products/1

  let products: Product[] = await session
    .query<Product>({ documentType: 'Product' })
    .usingDefaultOperator(QueryOperators.And)
    .whereEquals<string>('manufacturer', 'Apple')
    .whereEquals<boolean>('in_stock', true)
    .whereBetween<Date>('last_update', new Date('2017-10-01T00:00:00'), new Date())
    .whereGreaterThanOrEqual<number>('storage', 64)
    .all();

  products.forEach((product: Product): void => {
    console.log(product instanceof Product); // true
    console.log(product.id.includes('Products/')); // true
  });
})();
```


## Building

```bash
npm run build
```

## Running tests
```bash
npm test -- -h 192.168.5.44 [-p 8080] [-t DocumentSerializing [-f]]
```

| Option | Description |
| ------------- | ------------- |
| `-h` or `--ravendb-host=` | Database host |
| `-p` or `--ravendb-port=` | Database port. 8080 by default |
| `-t` or `--test=` | Test name. For run multiple test, specify each test in separate --test= option. By default runs all tests |
| `-f` or `--no-fixtures` | Skip executing database fixtures (create test database, put test indexes etc). Can be usable for tests which doesn't executes raven commands (e.g. DocumentSerializing) |
