# RavenDB node.js client

## Installation

```
npm install --save ravendb
```

## Getting started

1. Require `DocumentStore` class from package
```
const {DocumentStore} = require('ravendb');
```
or
```
const DocumentStore = require('ravendb').default;
```
or (using TypeScript)
```
import DocumentStore from 'ravendb';
```
2. Initialize store
```
const store = DocumentStore.create('database url', 'default database name');
store.initialize();
```
3. Open a session
```
const session = store.openSession();
```
4. Call `saveChanges()` when you'll finish working with a session
```
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
5. Optionally, dispose a store (if you didn't using an global store but create it in each request)
```
store
  .dispose()
  .then(() => {
    // here you can finish request
  })
```
## Supported asyncronous calls types
1. You can use callbacks
```
session
 .load('Users/1', (user) => {
   user.password = md5('new password');

   session.store(user, () => {
     session.saveChanges(() => {
       // here session is complete
     });
   });
 })
```
2. You can use promises aswell
```
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
3. With `co` libary or frameworks using it (such as `AdonisJS`) you can `yield` calls
```
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
```
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
Creating documents
```
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
Loading documents
```
product = await session.load('Products/1');
console.log(product.title); // iPhone X
console.log(product.id); // Products/1
```
Updating documents
```
product = await session.load('Products/1');
product.in_stock = false;
product.last_update = new Date();
await session.store(product);
await session.saveChanges();

product = await session.load('Products/1');
console.log(product.in_stock); // false
console.log(product.last_update); // outputs current date
```
Deleting documents
```
product = await session.load('Products/1');
await session.delete(product);
// or you can just do
// await session.delete('Products/1');
await session.saveChanges();

product = await session.load('Products/1');
console.log(product); // undefined
```
## Querying documents
1. Create DocumentQuery instance using `query()` method of session:
```
query = session.query({
  documentType: 'Product', // specify which collection you querying
  // optionally you may specify custom index for query from it
  // indexName: 'PopularProductsWithViewsCount'
});
```
2. Apply conditions, ordering etc. Query support chaining calls:
```
query
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
| Methods | SQL analogue or description |
| ------------- | ------------- |
|`selectFields(fields: string[], projections?: string[]): IDocumentQuery<T>;`|`SELECT field1 [AS projection1], ...`|
|`distinct(): IDocumentQuery<T>;`|`SELECT DISTINCT`|
|`whereEquals<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;`|`fieldName = <value>`|
|`whereNotEquals<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;`|`fieldName <> <value>`|
|`whereIn<V extends ConditionValue>(fieldName: string, values: V[], exact?: boolean): IDocumentQuery<T>;`|`fieldName IN (<value1>, <value2>, ...)`|
|`whereStartsWith<V extends ConditionValue>(fieldName: string, value: V): IDocumentQuery<T>;`|`fieldName LIKE '<value>%'`|
|`whereEndsWith<V extends ConditionValue>(fieldName: string, value: V): IDocumentQuery<T>;`|`fieldName LIKE '%<value>'`|
|`whereBetween<V extends ConditionValue>(fieldName: string, start: V, end: V, exact?: boolean): IDocumentQuery<T>;`|`fieldName BETWEEEN <start> AND <end>`|
|`whereGreaterThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;`|`fieldName > <value>`|
|`whereGreaterThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;`|`fieldName >= <value>`|
|`whereLessThan<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;`|`fieldName < <value>`|
|`whereLessThanOrEqual<V extends ConditionValue>(fieldName: string, value: V, exact?: boolean): IDocumentQuery<T>;`|`fieldName <= <value>`|
|`whereExists(fieldName: string): IDocumentQuery<T>;`|`fieldName IS NOT NULL`|
|`containsAny<V extends ConditionValue>(fieldName: string, values: V[]): IDocumentQuery<T>;`|`fieldName LIKE '%<value1>%' OR fieldName LIKE '%<value2>%' OR ...`|
|`containsAll<V extends ConditionValue>(fieldName: string, values: V[]): IDocumentQuery<T>;`|`fieldName LIKE '%<value1>%' AND fieldName LIKE '%<value2>%' AND ...`|
|`search(fieldName: string, searchTerms: string, operator?: SearchOperator): IDocumentQuery<T>;`|Performs full-text search|
|`openSubclause(): IDocumentQuery<T>;`|Opens subclause `(`|
|`closeSubclause(): IDocumentQuery<T>;`|Closes subclause `)`|
|`negateNext(): IDocumentQuery<T>;`|Adds `NOT` before next condition|
|`andAlso(): IDocumentQuery<T>;`|Adds `AND` before next condition|
|`orElse(): IDocumentQuery<T>;`|Adds `OR` before next condition|
|`usingDefaultOperator(operator: QueryOperator): IDocumentQuery<T>;`|Sets default operator (which will be used if no `andAlso()` / `orElse` was called. Just after query instatiation, `OR` is used as default operator. Default operator can be changed only adding any conditions|
|`orderBy(field: string, ordering?: OrderingType): IDocumentQuery<T>;`|`ORDER BY field [DESC]`|
|`randomOrdering(seed?: string): IDocumentQuery<T>;`|`ORDER BY RAND()`|

Condition value can be a string, number, boolean or null value or instance of Date class:

```
type ConditionValue = string | number | boolean | Date | null;
```

## Using ECMAScript 2015 classes as models instead of object literals

1. Define your model as class. Attributes should be just public properties:
```
class Product {
  constructor(
    title = '',
    price = 0,
    currency = 'USD',
    storage = 0,
    manufacturer = '',
    in_stock = false,
    last_update = null
  ) {
    Object.assign(this, {
      title, price, currency,
      storage, manufacturer, in_stock, 
      last_update: last_update || new Date()
    });  
  }
}
```
2. For store model just pass it's instance without speciying colleciton prefix (e.g. Products/). Collection name will be detected automatically by model's class name
```
let product = new Product(
  'iPhone X', 999.99, 'USD', 64, 'Apple', true,
   new Date('2017-10-01T00:00:00')
};

product = await session.store(product);
console.log(product instanceof Product); // true
console.log(product.id.includes('Products/')); // true
await session.saveChanges();
```
3. When loading document, pass class constructor as second parameter of `session.load()`:
```
let product = await session.load('Products/1', Product);
console.log(product instanceof Product); // true
console.log(product.id); // Products/1
```
4. When querying documents, pass class constructor `documentType` option of `session.query({  ... })`:
```
let products = await session.query({ documentType: Product }).all();

products.forEach((product) => {
  console.log(product instanceof Product); // true
  console.log(product.id.includes('Products/')); // true
});
```

Also you can set global models class resolver (something like class autoloader in PHP). It should be an callback function receives and model class name which should return it's constructor:

```
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

```
// models/Product.ts
export class Product {
  constructor(
    public title: string = '',
    public price: number = 0,
    public currency: string = 'USD',
    public storage: number = 0,
    public manufacturer: string = '',
    public in_stock: boolean = false,
    public last_update: Date = null
  ) {}
}

// file app.ts
import {DocumentStore, IDocumentStore, IDocumentSession, IDocumentQuery, DocumentConstructor} from 'ravendb';

const store: IDocumentStore = DocumentStore.create('database url', 'database name');
let session: IDocumentSession;

store.conventions.addDocumentInfoResolver({
  resolveConstructor: (typeName: string): DocumentConstructor =>
    <DocumentConstructor>require(`./models/${typeName}`)
});

(async (): Promise<void> => {
  let product: Product = new Product(
  'iPhone X', 999.99, 'USD', 64, 'Apple', true,
   new Date('2017-10-01T00:00:00')
  };

  product = await session.store(product);
  console.log(product instanceof Product); // true
  console.log(product.id.includes('Products/')); // true
  await session.saveChanges();

  product = await session.load('Products/1');
  console.log(product instanceof Product); // true
  console.log(product.id); // Products/1

  let products: Product[] = await session.query({ documentType: 'Product' }).all();

  products.forEach((product: Product): void => {
    console.log(product instanceof Product); // true
    console.log(product.id.includes('Products/')); // true
  });
})();
```


## Building

With global gulp installation:
```
gulp bundle
```

Without global gulp installation:
```
./node_modules/.bin/gulp bundle
```

or just
```
npm run _prepublish
```

## Running tests
```
npm test -- -h 192.168.5.44 [-p 8080] [-t DocumentSerializing [-f]]
```

| Option | Description |
| ------------- | ------------- |
| -h or --ravendb-host= | Database host |
| -p or --ravendb-port= | Database port. 8080 by default |
| -t or --test= | Test name. For run multiple test, specify each test in separate --test= option. By default runs all tests |
| -f or --no-fixtures | Skip executing database fixtures (create test database, put test indexes etc). Can be usable for tests which doesn't executes raven commands (e.g. DocumentSerializing) |
