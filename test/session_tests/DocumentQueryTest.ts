/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/chai-as-promised/index.d.ts" />

import {expect} from 'chai';
import * as _ from 'lodash';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
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
  let currentDatabase: string, defaultUrl: string;

  beforeEach(function (): void {
    ({currentDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
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
    await session.store<Company>(new Company('Company', 'withNesting', new Product(null, 'testing_order', 4)));
    await session.saveChanges();
  });

  describe('Index checking', () => {

    it('should query with where', async() => {
      const results: Product[] = await store.openSession().query<Product>().where({
        name: 'withNesting'
      }).get();
      console.log(results);
      expect(results[0]).to.equals(undefined);
    });

    it('should query by search', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product
      }).search('_id', '59885dbd8597dea0204c0bd0', 1).get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query with whereGreaterThan', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereGreaterThan<string>('greaterThan', '4').get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query by whereBetween', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereBetween<number>('Name', 2, 4).get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query by between or equal', async() => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereBetweenOrEqual('uid', 2, 4, 'name', 'val').get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query with whereGreaterThanOrEqual', async () => {
      const results: Product[] = await  store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereGreaterThanOrEqual<string>('greaterThan', '4', '10', '101').get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query with whereLessThan', async () => {
      const results: Product[] = await  store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereLessThan<number>('lessThan', 5).get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query with whereLessThanOrEqual', async () => {
      const results: Product[] = await  store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereLessThanOrEqual<number>('lessThan', 4, '10', '101').get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query by whereIn', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product
      }).whereIn<string>('name', 'withNesting').get();

      expect(results).to.have.lengthOf(0);
    });

    it('should query with orderBy', async() => {
      const results: Product[] = await store.openSession().query<Product>({
          documentType: Product
        }).orderBy<string>('id', 'Name').get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query with orderByDescending', async() => {
      const results: IRavenObject[] = await store.openSession().query({
        waitForNonStaleResults: true
      }).orderByDescending('id', 'Name').get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query with whereNotNull', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereNotNull<string>('greaterThan', 'fieldName').get()
      expect(results[0]).to.equals(undefined);
    });

    it('should query by whereEquals', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereEquals<string>('Name', 'document_name').get();

      expect(results).to.have.lengthOf(0);
    });

    it('should query with whereEndsWith', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereEndsWith<string>('search_value', 'ue').get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query with startsWith', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereStartsWith<string>('search_value', 'ue').get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query with whereIsNull', async () => {
      const results: Product[] = await store.openSession().query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      }).whereIsNull('null').get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query with selectFields', async () => {
      const results: Product[] = await store.openSession()
        .query<Product>({
        documentType: Product,
        indexName: 'Testing_Sort',
        waitForNonStaleResults: true
      })
        .selectFields('id', 'id').get();
      expect(results[0]).to.equals(undefined);
    });

  });
});
