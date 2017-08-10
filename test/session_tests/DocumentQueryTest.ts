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

import {Query} from "../../src/Documents/RQL/Query"

describe('Document query test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let currentDatabase: string, defaultUrl: string;

  let query = new Query('Universals');

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

    it('should query with whereEquals', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>()
        .whereEquals('name', 'withNesting').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereIn', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>()
        .whereIn('name', 'withNesting').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereGreaterThan', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>()
        .whereGreaterThan('order', 2).get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereLessThan', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>()
        .whereLessThan<number>('order', 6).get();
      expect(results[0]).to.be.a('object');
    });

    it('should query by startsWith', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .startsWith<string>('name','wi').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query by endsWith', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .endsWith<string>('name','ing').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query by search', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .search('name', 'withNesting').get();
      expect(results[0]).to.include({'name': 'withNesting'});
    });

    it('should query with orderBy', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .orderBy<string>('name', 'ASC').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with orderByDESC', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .orderBy<string>('name', 'DESC').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with selectFields', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>()
        .selectFields( 'id').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereIsNull', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereIsNull('nullField', 'null').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereNotNull', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
      .whereNotNull('nullField', 'null').get();
      expect(results).to.have.lengthOf(0);
    });

    it('should query with whereGreaterThanOrEqual', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereGreaterThanOrEqual<number>('order',6, 'name', 'withNesting').get();
      expect(results[0]).to.be.a('object');
    });

    it('should query with whereLessThanOrEqual', async () => {
      const results: Universal[] = await  store.openSession().query<Universal>()
        .whereLessThanOrEqual<number>('order',6, 'name', 'withNesting').get();
       expect(results[0]).to.be.a('object');
    });

    it('should query by between', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereBetween('order',1, 5).get();
      expect(results[0]).to.be.a('object');
    });

    it('should query by whereBetweenOrEqual', async () => {
      const results: Universal[] = await store.openSession().query<Universal>()
        .whereBetweenOrEqual('order',1, 5, 'name', 'withNesting').get();
      expect(results[0]).to.be.a('object');
    });


  });
});
