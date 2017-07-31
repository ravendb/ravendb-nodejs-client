/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/chai-as-promised/index.d.ts" />

import {expect} from 'chai';
import * as _ from 'lodash';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {Product, Order, Company, ProductsTestingSort} from "../TestClasses";
import {QueryOperators} from "../../src/Documents/Session/QueryOperator";
import {TypeUtil} from "../../src/Utility/TypeUtil";

describe('Document query test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function (): void {
    ({defaultDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    const productsTestingSort: ProductsTestingSort = new ProductsTestingSort(store);
    
    session = store.openSession();

    await productsTestingSort.execute();
    await session.store<Product>(new Product('Product/101', 'test101', 2, 'a'));
    await session.store<Product>(new Product('Product/10', 'test10', 3, 'b'));
    await session.store<Product>(new Product('Product/106', 'test106', 4, 'c'));
    await session.store<Product>(new Product('Product/107', 'test107', 5));
    await session.store<Product>(new Product('Product/103', 'test107', 6));
    await session.store<Product>(new Product('Product/108', 'new_testing', 90, 'd'));
    await session.store<Product>(new Product('Product/110', 'paginate_testing', 95));
    await session.store<Order>(new Order('Order/105', 'testing_order', 92, 'Product/108'));
    await session.store<Company>(new Company('Company/1', 'withNesting', new Product(null, 'testing_order', 4)));
    await session.saveChanges();    
  });

  describe('Index checking', () => {
    it('should query by dynamic index', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product
      }).whereEquals<string>('name', 'test101').get();
        
      expect(results[0].name).to.equals('test101');
    });

    it('should query by double index joined by "OR" operator', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product
      })
      .whereEquals<string>('name', 'test101')
      .whereEquals<number>('uid', 4).get();
        
      expect(results).to.have.lengthOf(2);
    });

    it('should query by double index joined by "AND" operator', async() => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        waitForNonStaleResults: true,
        usingDefaultOperator: QueryOperators.AND
      })
      .whereEquals<string>('name', 'test107')
      .whereEquals<number>('uid', 5).get();

      expect(results).to.have.lengthOf(1);
    });

    it('should query by whereIn', async() => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product
      }).whereIn<string>('name', ['test101', 'test107', 'test106']).get();
      
      expect(results).to.have.lengthOf(4);      
    });

    it('should query by startsWith', async() => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product
      }).whereStartsWith('name', 'n').get();
      
      expect(results[0].name).to.equals('new_testing');
    });

    it('should query by endsWith', async() => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product
      }).whereEndsWith('name', '7').get();
      
      expect(results[0].name).to.equals('test107');
    });

    it('should fail query with non-existing index', async () => expect(
        store.openSession().query({
          indexName: 's'
        }).where({'Tag': 'Products'}).get()
      ).to.be.rejected
    );

    it('should query with where', async() => expect(
        store.openSession().query().where({
          name: 'test101', 
          uid: [4, 6, 90]
        }).get()
      ).to.be.fulfilled
    );

    it('should query with index', async() => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).where({
        uid: [4, 6, 90]
      }).get();

      expect(results).to.have.lengthOf(3);
    });

    it('should query by between', async() => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereBetween<number>('uid', 2, 4).get();
      
      expect(results).to.have.lengthOf(1);
    });

    it('should query by between or equal', async() => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereBetweenOrEqual<number>('uid', 2, 4).get();
      
      expect(results).to.have.lengthOf(3);
    });

    it('should query by notNull', async () => {
      const results: IRavenObject[] = await store.openSession().query({
        waitForNonStaleResults: true
      }).whereNotNull('order').get();
       
      expect(_.some(results, (result: IRavenObject) => TypeUtil.isNone(result.order))).to.be.false; 
    });

    it('should query with ordering', async() => {
      const results: IRavenObject[] = await store.openSession().query({
        waitForNonStaleResults: true
      }).whereNotNull('order').orderBy('order').get();

      expect(results[0].order).to.equals('a');
    });

    it('should query with descending ordering', async() => {
      const results: IRavenObject[] = await store.openSession().query({
        waitForNonStaleResults: true
      }).whereNotNull('order').orderByDescending('order').get();

      expect(results[0].order).to.equals('d');
    });

    it('should paginate', async() => {
      const expectedUids: number[][] = [[2,3],[4,5],[6,90],[95]];
      const pageSize: number = 2;
      
      const totalCount: number = await store.openSession().query<Product>({
        documentType: Product,
        waitForNonStaleResults: true
      }).whereNotNull('uid').count();

      const totalPages: number = Math.ceil(totalCount / pageSize);

      expect(totalCount).to.equals(7);
      expect(totalPages).to.equals(4);

      for (let page: number = 1; page <= totalPages; page++) {
        const products: Product[] = await store.openSession().query<Product>({
          documentType: Product,
          waitForNonStaleResults: true
        }).whereNotNull('uid').orderBy('uid').skip((page - 1) * pageSize).take(pageSize).get();

        expect(products).to.have.length.lte(pageSize);
        products.forEach((product: Product, index: number) => expect(product.uid).to.equals(expectedUids[page - 1][index]));
      }
    });

    it('should query with includes', async() => {
      session = store.openSession();

      await session.query({
        waitForNonStaleResults: true, 
        includes: ['product_id']
      }).where({uid: 92}).get();

      await session.load('Product/108');
      expect(session.numberOfRequestsInSession).to.equals(1);            
    });

    it('should query with nested objects', async() => {
      const results: Company[] = await store.openSession().query<Company>({
        documentType: Company,
        nestedObjectTypes: {product: Product}
      }).whereEquals<string>('name', 'withNesting').get();

      expect(results[0].product).to.be.instanceOf(Product);
      expect(results[0]).to.be.instanceOf(Company)
    });

    it('should make query with fetch terms', async() => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        waitForNonStaleResults: true,
        indexName: 'Testing_Sort'
      })
      .whereBetweenOrEqual<number>('uid', 2, 4).selectFields('doc_id').get();
      
      expect(_.every(results, (result: Product) => result.hasOwnProperty('doc_id'))).to.be.true;
    });
  });  
});
