/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/chai-as-promised/index.d.ts" />

import {expect} from 'chai';
import * as _ from 'lodash';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {Product, Order, Company, ProductsTestingSort} from "../TestClasses";
import {QueryOperators} from "../../src/Documents/Session/Query/QueryLanguage";
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
      const results: Product[] = await store.openSession()
        .query<Product>({
          documentType: Product
        })
        .waitForNonStaleResultsAsOfNow()        
        .whereEquals<string>('name', 'test101')
        .all();
        
      expect(results[0].name).to.equals('test101');
    });

    it('should query by double index joined by "OR" operator', async () => {
      const results: Product[] = await store.openSession()
        .query<Product>({
          documentType: Product
        })
        .waitForNonStaleResultsAsOfNow()        
        .whereEquals<string>('name', 'test101')
        .whereEquals<number>('uid', 4)
        .all();
        
      expect(results).to.have.lengthOf(2);
    });

    it('should query by double index joined by "AND" operator', async() => {
      const results: Product[] = await store.openSession()
        .query<Product>({
          documentType: Product
        })
        .waitForNonStaleResultsAsOfNow()        
        .usingDefaultOperator(QueryOperators.And)
        .whereEquals<string>('name', 'test107')
        .whereEquals<number>('uid', 5)
        .all();

      expect(results).to.have.lengthOf(1);
    });

    it('should query by whereIn', async() => {
      const results: Product[] = await store.openSession()
        .query<Product>({
          documentType: Product
        })
        .waitForNonStaleResultsAsOfNow() 
        .whereIn<string>('name', ['test101', 'test107', 'test106'])
        .all();
        
      expect(results).to.have.lengthOf(4);      
    });

    it('should query by startsWith', async() => {
      const results: Product[] = await store.openSession()
        .query<Product>({
          documentType: Product
        })
        .waitForNonStaleResultsAsOfNow()
        .whereStartsWith<string>('name', 'n')
        .all();
      
      expect(results[0].name).to.equals('new_testing');
    });

    it('should query by endsWith', async() => {
      const results: Product[] = await store.openSession()
        .query<Product>({
          documentType: Product
        })
        .waitForNonStaleResultsAsOfNow()
        .whereEndsWith<string>('name', '7')
        .all();
      
      expect(results[0].name).to.equals('test107');
    });

    it('should fail query with non-existing index', async () => expect(
      store.openSession()
        .query({
          indexName: 's'
        })
        .waitForNonStaleResultsAsOfNow()
        .whereEquals<string>('Tag', 'Products')
        .all()
      ).to.be.rejected
    );

    it('should query with index', async() => {
      const results: Product[] = await store.openSession()
        .query<Product>({
          documentType: Product,
          indexName: 'Testing_Sort'
        })
        .waitForNonStaleResultsAsOfNow()
        .whereIn<number>('uid', [4, 6, 90])
        .all();

      expect(results).to.have.lengthOf(3);
    });

    it('should query by between', async() => {
      const results: Product[] = await store.openSession()
        .query<Product>({
          documentType: Product,
          indexName: 'Testing_Sort'
        })
        .waitForNonStaleResultsAsOfNow()
        .whereBetween<number>('uid', 2, 4)
        .all();
      
      expect(results).to.have.lengthOf(1);
    });

    it('should query by between with exact', async() => {
      const results: Product[] = await store.openSession()
      .query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort'
      })
      .waitForNonStaleResultsAsOfNow()
      .whereBetween<number>('uid', 2, 4, true)
      .all();
      
      expect(results).to.have.lengthOf(3);
    });

    it('should query by exists', async () => {
      const results: IRavenObject[] = await store.openSession()
        .query()
        .waitForNonStaleResultsAsOfNow()
        .whereExists('order')
        .all();
       
      expect(_.some(results, (result: IRavenObject) => TypeUtil.isNull(result.order))).to.be.false; 
    });

    it('should query with ordering', async() => {
      const results: IRavenObject[] = await store.openSession()
        .query()
        .waitForNonStaleResultsAsOfNow()
        .whereExists('order')
        .orderBy('order')
        .all();

      expect(results[0].order).to.equals('a');
    });

    it('should query with descending ordering', async() => {
      const results: IRavenObject[] = await store.openSession()
        .query()
        .waitForNonStaleResultsAsOfNow()
        .whereExists('order')
        .orderByDescending('order')
        .all();

      expect(results[0].order).to.equals('d');
    });

    it('should paginate', async() => {
      const expectedUids: number[][] = [[2,3],[4,5],[6,90],[95]];
      const pageSize: number = 2;
      
      const totalCount: number = await store.openSession()
        .query<Product>({
          documentType: Product,
        })
        .waitForNonStaleResultsAsOfNow()
        .whereExists('uid')
        .count();

      const totalPages: number = Math.ceil(totalCount / pageSize);

      expect(totalCount).to.equals(7);
      expect(totalPages).to.equals(4);

      for (let page: number = 1; page <= totalPages; page++) {
        const products: Product[] = await store.openSession()
          .query<Product>({
            documentType: Product
          })
          .waitForNonStaleResultsAsOfNow()
          .whereExists('uid')
          .orderBy('uid')
          .skip((page - 1) * pageSize)
          .take(pageSize)
          .all();

        expect(products).to.have.length.lte(pageSize);
        products.forEach((product: Product, index: number) => expect(product.uid).to.equals(expectedUids[page - 1][index]));
      }
    });

    it('should query with includes', async() => {
      session = store.openSession();

      await session.query<Order>({
        documentType: Order
      })
      .waitForNonStaleResultsAsOfNow()
      .whereEquals('uid', 92)
      .include('product_id')
      .all();

      await session.load<Product>('Product/108', Product);
      expect(session.numberOfRequestsInSession).to.equals(1);            
    });

    it('should query with nested objects', async() => {
      const results: Company[] = await store.openSession()
        .query<Company>({
          documentType: Company,
          nestedObjectTypes: {product: Product}
        })
        .waitForNonStaleResultsAsOfNow()
        .whereEquals<string>('name', 'withNesting')
        .all();

      expect(results[0].product).to.be.instanceOf(Product);
      expect(results[0]).to.be.instanceOf(Company)
    });

    it('should make query with fetch terms', async() => {
      const results: Product[] = await store.openSession()
        .query<Product>({
          documentType: Product,
          indexName: 'Testing_Sort'
        })
        .waitForNonStaleResultsAsOfNow()
        .selectFields(['doc_id'])
        .whereBetween<number>('uid', 2, 4, true)
        .all();
      
      expect(_.every(results, (result: Product) => result.hasOwnProperty('doc_id'))).to.be.true;
    });
  });  
});
