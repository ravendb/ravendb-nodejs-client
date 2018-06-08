# RavenDB client for Node.js

[![build status](https://travis-ci.org/ravendb/ravendb-nodejs-client.svg?branch=v4.0)](https://travis-ci.org/ravendb/ravendb-nodejs-client)
## Installation

```bash
npm install --save ravendb
```

## Getting started

1. Require `DocumentStore` class from package
```javascript
const { DocumentStore } = require('ravendb');
```
or (using ES6 / Typescript imports)
```javascript
import { DocumentStore } from 'ravendb';
```
2. Initialize document store (you should have one DocumentStore instance per application)
```javascript
const store = new DocumentStore('http://live-test.ravendb.net', 'databaseName');
store.initialize();
```
3. Open a session
```javascript
const session = store.openSession();
```
4. Call `saveChanges()` once you're done:
```javascript
session
 .load('users/1-A')
 .then((user) => {
   user.password = PBKDF2('new password');
   return session.store(user);
 })
 .then(() => session.saveChanges())
 .then(() => {
    // data is persisted
    // you can proceed e.g. finish web request
  });
```

## Supported asynchronous call types
1. async / await 
```javascript
const session = store.openSession();
let user = await store.load('users/1-A');
user.password = PBKDF2('new password');
await session.store(user);
await session.saveChanges();
```
2. Promises
```javascript
session.load('Users/1-A')
    .then((user) => {
        user.password = PBKDF2('new password');
        return session.store(user);
    })
    .then(() => session.saveChanges())
    .then(() => {
        // here session is complete
    });
```
2. Callbacks
```javascript
session.load('users/1-A', (user) => {
    user.password = PBKDF2('new password');
    session.store(user, () => {
        session.saveChanges(() => {
            // data is persisted
        });
    });
});
```

## CRUD example

### Storing documents
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

await session.store(product, 'products/');
console.log(product.id); // Products/1-A
await session.saveChanges();
```

### Loading documents
```javascript
const product = await session.load('products/1-A');
console.log(product.title);    // iPhone X
console.log(product.id);       // Products/1-A
```
### Updating documents
```javascript
let product = await session.load('products/1-A');
product.in_stock = false;
product.last_update = new Date();
await session.store(product);
await session.saveChanges();
// ...
product = await session.load('products/1-A');
console.log(product.in_stock);      // false
console.log(product.last_update);   // 2018-06-05T13:52:31.633Z
```

### Deleting documents
1. Using entity
```javascript
let product = await session.load('products/1-A');
await session.delete(product);
await session.saveChanges();

product = await session.load('products/1-A');
console.log(product); // undefined
```

2. Using document ID
```javascript
await session.delete('products/1-A');
```

## Querying documents
1. Use `query()` session method:

By collection:
```javascript
const query = session.query({ collection: 'products' });
```

By index name:
```javascript
const query = session.query({ indexName: 'productsByCategory' });
```

Using entity type:
```javascript
import { User } from "./models";
const query = session.query(User);
```

2. Build up the query - apply conditions, set ordering etc. Query supports chaining calls:
```javascript
query
  .waitForNonStaleResults()
  .usingDefaultOperator('AND')  
  .whereEquals('manufacturer', 'Apple')
  .whereEquals('in_stock', true)
  .whereBetween('last_update', new Date('2017-10-01T00:00:00'), new Date())
  .orderBy('price');
```

3. Finally, you may get query results:
```javascript
const results = await query.all();
// ...
const firstOne = await query.first(); // gets first result
// ...
const single = await query.single();  // gets single result
```

### DocumentQuery methods overview

#### selectFields() - projections using a single field
```javascript

// RQL
// from users select name
const userNames = await session.query({ collection: "users" })
    .selectFields("name")
    .all(); 
// John,Stefanie,Thomas
```

#### selectFields() - projections using multiple fields
```javascript
// RQL
// from users select name, age
await session.query({ collection: "users" })
    .selectFields([ "name", "age" ])
    .all();
// [ { name: 'John', age: 30, id: 'users/1-A' },
//   { name: 'Stefanie', age: 25, id: 'users/2-A' },
//   { name: 'Thomas', age: 25, id: 'users/3-A' } ]
```

#### distinct()
```javascript
// RQL
// from users select distinct age
await session.query({ collection: "users" })
    .selectFields("age")
    .distinct()
    .all(); // [ 25, 30 ]
```

#### whereEquals() / whereNotEquals()
```javascript
// RQL
// from users where age = 30 
await session.query({ collection: "users" })
    .whereEquals("age", 30)
    .all();  
// [ User {
//    name: 'John',
//    age: 30,
//    kids: [...],
//    registeredAt: 2017-11-10T23:00:00.000Z } ]
```

#### whereIn()
```javascript
// RQL
// from users where name in ("John", "Thomas")
await session.query({ collection: "users" })
    .whereIn("name", ["John", "Thomas"])
    .all();  
// [ User {
//     name: 'John',
//     age: 30,
//     registeredAt: 2017-11-10T23:00:00.000Z,
//     kids: [...],
//     id: 'users/1-A' },
//   User {
//     name: 'Thomas',
//     age: 25,
//     registeredAt: 2016-04-24T22:00:00.000Z,
//     id: 'users/3-A' } ]
```

#### whereStartsWith() / whereEndsWith()
```javascript
// RQL
// from users where startsWith(name, 'J')
await session.query({ collection: "users" })
    .whereStartsWith("name", "J")
    .all();  
// [ User {
//    name: 'John',
//    age: 30,
//    kids: [...],
//    registeredAt: 2017-11-10T23:00:00.000Z } ]
```

#### whereBetween()
```javascript
// RQL
// from users where registeredAt between '2016-01-01' and '2017-01-01'
await session.query({ collection: "users" })
    .whereBetween("registeredAt", new Date(2016, 0, 1), new Date(2017, 0, 1))
    .all();  
// [ User {
//     name: 'Thomas',
//     age: 25,
//     registeredAt: 2016-04-24T22:00:00.000Z,
//     id: 'users/3-A' } ]
```

#### whereGreaterThan() / whereGreaterThanOrEqual() / whereLessThan() / whereLessThanOrEqual()
```javascript
// RQL
// from users where age > 29
await session.query({ collection: "users" })
    .whereGreaterThan("age", 29);
    .all();  
// [ User {
//   name: 'John',
//   age: 30,
//   registeredAt: 2017-11-10T23:00:00.000Z,
//   kids: [...],
//   id: 'users/1-A' } ]
```

#### whereExists()
Checks if the field exists.
```javascript
// RQL
// from users where exists("age")
await session.query({ collection: "users" })
    .whereExists("kids");
    .all();  
// [ User {
//   name: 'John',
//   age: 30,
//   registeredAt: 2017-11-10T23:00:00.000Z,
//   kids: [...],
//   id: 'users/1-A' } ]
```

#### containsAny() / containsAll()
```javascript
// RQL
// from users where kids in ('Mara')
await session.query({ collection: "users" })
    .containsAll("kids", ["Mara", "Dmitri"]);
    .all();  
// [ User {
//   name: 'John',
//   age: 30,
//   registeredAt: 2017-11-10T23:00:00.000Z,
//   kids: ["Dmitri", "Mara"]
//   id: 'users/1-A' } ]
```

#### search()
Performs full-text search.
```javascript
// RQL
// from users where search(kids, 'Mara')
await session.query({ collection: "users" })
    .search("kids", "Mara Dmitri");
    .all();  
// [ User {
//   name: 'John',
//   age: 30,
//   registeredAt: 2017-11-10T23:00:00.000Z,
//   kids: ["Dmitri", "Mara"]
//   id: 'users/1-A' } ]
```

#### openSubclause() / closeSubclause()
```javascript
// RQL
// from users where exists(kids) or (age = $p0 and name != $p1)
await session.query({ collection: "users" })
    .whereExists("kids")
    .orElse()
    .openSubclause()
        .whereEquals("age", 25)
        .whereNotEquals("name", "Thomas")
    .closeSubclause();
    .all();  
// [ User {
//     name: 'John',
//     age: 30,
//     registeredAt: 2017-11-10T23:00:00.000Z,
//     kids: ["Dmitri", "Mara"]
//     id: 'users/1-A' },
//   User {
//     name: 'Stefanie',
//     age: 25,
//     registeredAt: 2015-07-29T22:00:00.000Z,
//     id: 'users/2-A' } ]
```

#### not()
```javascript
// RQL
// from users where age != 25
await session.query({ collection: "users" })
    .not()
    .whereEquals("age", 25)
    .all();  
// [ User {
//   name: 'John',
//   age: 30,
//   registeredAt: 2017-11-10T23:00:00.000Z,
//   kids: ["Dmitri", "Mara"]
//   id: 'users/1-A' } ]
```

#### andAlso() / orElse()
```javascript
// RQL
// from users where age != 25
await session.query({ collection: "users" })
    .whereExists("kids")
    .orElse()
    .whereLessThan("age", 30)
    .all();  
//  [ User {
//     name: 'John',
//     age: 30,
//     registeredAt: 2017-11-10T23:00:00.000Z,
//     kids: [ 'Dmitri', 'Mara' ],
//     id: 'users/1-A' },
//   User {
//     name: 'Thomas',
//     age: 25,
//     registeredAt: 2016-04-24T22:00:00.000Z,
//     id: 'users/3-A' },
//   User {
//     name: 'Stefanie',
//     age: 25,
//     registeredAt: 2015-07-29T22:00:00.000Z,
//     id: 'users/2-A' } ]
```

#### usingDefaultOperator()
Sets default operator (which will be used if no `andAlso()` / `orElse()` was called. Just after query instantiation, `OR` is used as default operator. Default operator can be changed only adding any conditions.

#### orderBy() / randomOrdering()
```javascript
// RQL
// from users order by age
await session.query({ collection: "users" })
    .orderBy("age") // .randomOrdering()
    .all();
// [ User {
//     name: 'Stefanie',
//     age: 25,
//     registeredAt: 2015-07-29T22:00:00.000Z,
//     id: 'users/2-A' },
//   User {
//     name: 'Thomas',
//     age: 25,
//     registeredAt: 2016-04-24T22:00:00.000Z,
//     id: 'users/3-A' },
//   User {
//     name: 'John',
//     age: 30,
//     registeredAt: 2017-11-10T23:00:00.000Z,
//     kids: [ 'Dmitri', 'Mara' ],
//     id: 'users/1-A' } ]
```
#### take()
Limits the number of result entries to `count`.
```javascript
// RQL
// from users order by age
await session.query({ collection: "users" })
    .orderBy("age") 
    .take(2)
    .all();
// [ User {
//     name: 'Stefanie',
//     age: 25,
//     registeredAt: 2015-07-29T22:00:00.000Z,
//     id: 'users/2-A' },
//   User {
//     name: 'Thomas',
//     age: 25,
//     registeredAt: 2016-04-24T22:00:00.000Z,
//     id: 'users/3-A' } ]
```

#### skip()
Skips first `count` results.
```javascript
// RQL
// from users order by age
await session.query({ collection: "users" })
    .orderBy("age") 
    .take(1)
    .skip(1)
    .all();
// [ User {
//     name: 'Thomas',
//     age: 25,
//     registeredAt: 2016-04-24T22:00:00.000Z,
//     id: 'users/3-A' } ]
```

#### all() / first() / single() / count()
`all()` - returns all results

`first()` - first result

`single()` - first result, throws error if there's more entries

`count()` - returns the count of the results (not affected by `take()`)

## Using ECMAScript 2015 classes as models 

1. Define your model as class. Attributes should be just public properties:
```javascript
export class Product {
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

2. To store a document pass its instance to `store()`. Collection name will be detected automatically using entity's class name.
```javascript
import { Product } from "./models";

let product = new Product(
  null, 'iPhone X', 999.99, 'USD', 64, 'Apple', true, new Date('2017-10-01T00:00:00'));

product = await session.store(product);
console.log(product instanceof Product);         // true
console.log(product.id.includes('products/'));   // true
await session.saveChanges();
```
3. When loading document, you can use `session.load()`. Pass class constructor as a second argument:
```javascript
let product = await session.load('products/1-A', Product);
console.log(product instanceof Product);    // true
console.log(product.id);                    // Products/1-A
```

*NOTE: To limit passing class constructors around, register the type in document store's conventions like so:*
```javascript
import { Product } from "./models";
const store = new DocumentStore(url, dbName);
store.conventions.registerEntityType(Product);

// ...

let product = await session.load('products/1-A');
console.log(product instanceof Product);    // true
console.log(product.id);                    // Products/1-A
```

4. When querying documents, you pass class constructor as `documentType` option of `session.query({ ... })`:
```javascript
let products = await session.query({
  collection: 'products',
  documentType: Product // you can drop this if type has been registered in conventions using store.conventions.registerEntityType()
}).all();

products.forEach((product) => {
  console.log(product instanceof Product); // true
  console.log(product.id.includes('Products/')); // true
});
```

## Usage with TypeScript
TypeScript typings are embedded into the package (see `types` property in `package.json`). 

```typescript

// file models/product.ts

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

// file app.ts
import {Product} from "models/product";
import {DocumentStore, IDocumentStore, IDocumentSession, IDocumentQuery, DocumentConstructor, QueryOperators} from 'ravendb';

const store: IDocumentStore = new DocumentStore('url', 'database name');
store.conventions.registerEntityType(Product);
let session: IDocumentSession;

store.initialize();

(async (): Promise<void> => {
  let product = new Product(
    null, 'iPhone X', 999.99, 'USD', 64, 'Apple', true, new Date('2017-10-01T00:00:00')
  );

  await session.store<Product>(product);
  await session.saveChanges();
  console.log(product instanceof Product); // true
  console.log(product.id.includes('products/')); // true

  product = await session.load<Product>('products/1-A');
  console.log(product instanceof Product); // true
  console.log(product.id); // products/1-A

  let products: Product[] = await session
    .query<Product>({ collection: 'Products' })
    .waitForNonStaleResults()
    .whereEquals('manufacturer', 'Apple')
    .whereEquals('in_stock', true)
    .whereBetween('last_update', new Date('2017-10-01T00:00:00'), new Date())
    .whereGreaterThanOrEqual('storage', 64)
    .all();

  products.forEach((product: Product): void => {
    console.log(product instanceof Product); // true
    console.log(product.id.includes('products/')); // true
  });
})();
```

## Working with secured server

1. Fill auth options object. Pass contents of the pem/pfx certificate, specify its type and (optionally) a passphrase:
```javascript
const {DocumentStore, Certificate} = require('ravendb');

const certificate = `
-----BEGIN CERTIFICATE-----
...
-----END CERTIFICATE-----
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
`;

let authOptions = {
  certificate,
  type: "pem",
  password: "my passphrase" // optional  
};
``` 

PFX certificates content should be passed as `Buffer` object:

```javascript
const {DocumentStore} = require('ravendb');
const fs = require('fs');

const certificate = './cert.pfx';

let authOptions = {
  certificate: fs.readFileSync(certificate),
  type: "pfx",
  password: 'my passphrase' // optional  
};
``` 

2. Pass auth options as third argument to `DocumentStore` constructor:

```javascript
let store = new DocumentStore('url', 'databaseName', authOptions);
store.initialize();
```

## Building

```bash
npm install
npm run build
```

## Running tests
```bash
# To run the suite one needs to set the following environment variables:
# 
# - the location or RavenDB server binary:
# RAVENDB_TEST_SERVER_PATH="C:\\work\\test\\Server\\Raven.Server.exe" 
#
# - certificate path for tests requiring secure server
# RAVENDB_TEST_SERVER_CERTIFICATE_PATH="C:\\work\\test\\cluster.server.certificate.pfx"
#
# - certificate hostname 
# RAVENDB_TEST_SERVER_HOSTNAME="a.nodejstest.development.run"
#
npm test 
```
