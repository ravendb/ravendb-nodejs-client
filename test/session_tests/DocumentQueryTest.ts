/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/chai-as-promised/index.d.ts" />

import {expect} from 'chai';
import * as _ from 'lodash';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {Product, Order, Company, ProductsTestingSort, Universal} from "../TestClasses";

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
    await session.store<Universal>(new Universal('Universals_NEW', 'withNesting', 2, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals', 'withNesting', 4, null, new Product(null, 'testing_order', 4)));
    await session.saveChanges();
  });

  describe('Index checking', () => {

    it('should query with where', async () => {
      const results: Universal[] = await store.openSession().query<Universal>().where('Universals',{
        'name': 'withNesting'
      }).get();
      expect(results[0]).to.include({'name': 'withNesting'});
    });

    it('should query with whereSeveral', async () => {
      const results: Universal[] = await store.openSession().query<Universal>().where('Universals',{
        'name': ['withNesting', 'new_name']
      }).get();
      expect(results[0]).to.include({'name': 'withNesting'});
    });

    it('should fail query with non-existing name', async () => {
    const results: Universal[] = await store.openSession().query<Universal>({
        indexName: 'ss'
      }).where('Universals', {'name_none': 'withNesting'}).get();
      expect(results[0]).to.equals(undefined);
    });

    it('should query by whereIn', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereIn<string>('Universals','name', 'withNesting').get();
      expect(results[0]).to.include({'name': 'withNesting'});
    });

    it('should query by whereBetween', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereBetween<number>('Universals','order', 2, 4).get();
      expect(results[0]).to.be.a('object');
    });

    it('should query by whereEquals', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereEquals<string>('Universals','name', 'withNesting').get();
      expect(results[0]).to.include({'name': 'withNesting'});
    });

    it('should query with whereIsNull', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereIsNull('Universals','nullField').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereNotNull', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereNotNull<string>('Universals','nullField', 'name').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereEndsWith', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereEndsWith<string>('Universals','name', 'ing').get();
      expect(results[0]).to.include({'name': 'withNesting'});
    });

    it('should query with whereGreaterThan', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereGreaterThan<number>('Universals','order', 2).get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereGreaterThanOrEqual', async () => {
      const results: Universal[] = await  store.openSession().query<Universal>()
        .whereGreaterThanOrEqual<string>('Universals','order', '2', 'name', 'withNesting').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereLessThan', async () => {
      const results: Universal[] = await  store.openSession().query<Universal>()
        .whereLessThan<number>('Universals','order', 5).get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereLessThanOrEqual', async () => {
      const results: Universal[] = await  store.openSession().query<Universal>()
        .whereLessThanOrEqual<number>('Universals','order', 5, 'name', 'withNesting').get();
       expect(results[0]).to.be.a('object');
    });

    it('should query by search', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .search('Universals','name', 'withNesting', 3).get();
      expect(results[0]).to.include({'name': 'withNesting'});
    });

    it('should query by between or equal', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereBetweenOrEqual('Universals','order', 1, 4, 'name', 'withNesting').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with orderBy', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .orderBy<string>('id', 'name').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with orderByDescending', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .orderByDescending('id', 'name').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with startsWith', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereStartsWith<string>('Universals','name', 'with').get();
      expect(results[0]).to.include({'name': 'withNesting'});
    });

    it('should query with selectFields', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>()
        .selectFields('id', 'Universals').get();
      expect(results[0]).to.be.a('object');
    });

  });
});
