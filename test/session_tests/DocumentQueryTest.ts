/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/chai-as-promised/index.d.ts" />

import {expect} from 'chai';
import * as _ from 'lodash';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Database/IRavenObject";
import {Product, ProductsTestingSort, Universal} from "../TestClasses";
import {QueryBuilder} from "../../src/Documents/RQL/QueryBuilder";

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
    await session.store<Universal>(new Universal('Universals_1', 'withNesting', 1, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_2', 'withNesting', 2, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_3', 'withNesting', 3, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_4', 'withNesting', 4, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_5', 'withNesting', 5, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_6', 'withNesting', 6, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_7', 'withNesting', 7, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_8', 'withNesting', 8, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_9', 'withNesting', 9, null, new Product(null, 'testing_order', 4)));
    await session.store<Universal>(new Universal('Universals_10', 'withNesting', 10, null, new Product(null, 'testing_order', 4)));
    await session.saveChanges();
  });


  describe('Index checking', () => {

    it('should query with whereEqualsAndOr', async () => {
      const results: Universal[] = await  store.openSession()
        .query<Universal>({
          // indexName: 'Universals',
          documentType: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereEqualsAndOr<number>('name','withNesting','order',3,'order',4).get();

      expect(results).to.have.lengthOf(2);

      results.map(function(obj) {

        expect(obj).to.include({'name': 'withNesting'});

      });

    });

    it('should query with orderBy as long', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .orderBy<string>('order as long', 'ASC').get();

      expect(results).to.have.lengthOf(10);

        results.map(function(obj, index) {
          index += 1;
          expect(obj.order).to.be.equal(index);
        });

    });

    it('should query with orderBy as string', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .orderBy<string>('order', 'ASC').get();

      expect(results[1].order).to.be.equal(10);

    });

    it('should query with orderByDESC as long', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .orderBy<string>('order as long', 'DESC').get();

      expect(results).to.have.lengthOf(10);

      results.reverse().map(function(obj, index) {
        index += 1;
        expect(obj.order).to.be.equal(index);
      });

    });

    it('should query with whereGreaterThanOrEqual', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereGreaterThanOrEqual<number>('order',6, 'name', 'withNesting').get();

      expect(results).to.have.lengthOf(10);

        results.map(function(obj) {

          expect(obj).to.include({'name': 'withNesting'});

        });

    });

    it('should query with whereLessThanOrEqual', async () => {
      const results: Universal[] = await  store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereLessThanOrEqual<number>('order',6, 'name', 'withNesting').get();

      expect(results).to.have.lengthOf(10);

      results.map(function(obj) {

        expect(obj).to.include({'name': 'withNesting'});

      });

    });

    it('should query with nested objects', async () => {
      const results: Universal[] = await store.openSession().query<Universal>({
        indexName: 'Universals',
        nestedObjectTypes: {product: Product}
      }).whereEquals<string>('name', 'withNesting').get();

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
        expect(obj.product.name).to.equal('testing_order');
      });

    });

    it('should make query with fetch terms', async () => {
      const results: Universal[] = await store.openSession().query<Universal>({
        WaitForNonStaleResults: true,
        indexName: 'Universals'
      }).selectFields('id').get();

      expect(results).to.have.lengthOf(10);
      expect(_.every(results, (result: Product) => result.hasOwnProperty('id'))).to.be.true;

    });

    it('should query with whereArray', async () => expect(
      store.openSession().query<Universal>({
        indexName: 'Universals'
      }).where({
        name: [4, 6, 90]
      }).get()
      ).to.be.fulfilled
    );

    it('should query with where', async () => expect(
      store.openSession().query<Universal>({
        indexName: 'Universals'
      }).where({name: 4}).get()
      ).to.be.fulfilled
    );

    it('should fail query with non-existing index', async () => {
      const results = await store.openSession().query<Universal>({
        indexName: 'none'
      }).whereIn('Tag', 'Products').get();

      expect(results).to.have.lengthOf(0);

    });

    it('should query by @all_docs index', async () => {
      const results: Universal[] = await store.openSession().query<Universal>({
        indexName: 'Universals'
      }).whereIn('name', 'withNesting').get();

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
      });

    });

    it('should paginate', async () => {
      const pageSize: number = 2;

      const totalCount: Universal[] = await store.openSession().query<Universal>({
        indexName: 'Universals',
        WaitForNonStaleResults: true
      }).whereIn('name', 'withNesting').get();

      const totalPages: number = Math.ceil(totalCount.length / pageSize);

      totalCount.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
      });

      expect(totalCount).to.have.lengthOf(10);
      expect(totalPages).to.equals(5);

    });

    it('should query with whereEquals', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereEquals('name', 'withNesting').get();

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
      });

    });

    it('should query with andAlso', async () => {
      const results = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .andAlso();

      expect(results['_builder']).to.be.instanceOf(QueryBuilder);
      expect(results['_builder'].operator).to.equal('AND');

    });

    it('should query with orElse', async () => {
      const results = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .orElse();

      expect(results['_builder']).to.be.instanceOf(QueryBuilder);
      expect(results['_builder'].operator).to.equal('OR');

    });

    it('should query with negateNext', async () => {
      const results = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .negateNext();

      expect(results['_builder']).to.be.instanceOf(QueryBuilder);
      expect(results['_builder'].negate).to.equal(true);

    });

    it('should query with whereIn', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereIn('name', 'withNesting').get();

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
      });

    });

    it('should query with whereGreaterThan', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereGreaterThan('order', 2).get();

      expect(results).to.have.lengthOf(8);

      results.map(function (obj) {
        expect(obj.order).to.not.be.lessThan(2);
        expect(obj.order).to.be.greaterThan(2);
      });

    });

    it('should query with whereLessThan', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereLessThan<number>('order', 6).get();

      expect(results).to.have.lengthOf(5);

      results.map(function (obj) {
        expect(obj.order).to.not.be.greaterThan(6);
        expect(obj.order).to.be.lessThan(6);
      });

    });

    it('should query with whereLessThan with :p', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true,
          queryParameters: {
            "p0" : 6
          }
        })
        .whereLessThan<string>('order', ':p0').get();

      expect(results).to.have.lengthOf(5);

      results.map(function (obj) {
        expect(obj.order).to.not.be.greaterThan(6);
        expect(obj.order).to.be.lessThan(6);
      });

    });

    it('should query by startsWith', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .startsWith<string>('name', 'wi').get();

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj).to.include({'name': 'withNesting'});
        expect(obj.name).to.contain('wi');
      });

    });

    it('should query by endsWith', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .endsWith<string>('name', 'ing').get();

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj).to.include({'name': 'withNesting'});
        expect(obj.name).to.contain('ing');
      });

    });

    it('should query by search', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .search('name', 'withNesting', 'order', 2, '=', 2).get();

      expect(results).to.have.lengthOf(10);
      expect(results[0].order).to.be.equal(2);
      expect(results[0]).to.include({'name': 'withNesting'});

    });

    it('should query with selectFields', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .selectFields('id').get();

      expect(results).to.have.lengthOf(10);

      results.map(function (obj, index) {
        index += 1;
        expect(obj['__document_id']).to.contain(`Universals_${index}`);
      });

    });

    it('should query with selectFields without field', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .selectFields().get();

      expect(results).to.have.lengthOf(10);

      results.map(function (obj, index) {
        index += 1;
        expect(obj['__document_id']).to.contain(`Universals_${index}`);
      });

    });

    it('should query with whereIsNull', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereIsNull('nullField', 'null').get();

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.nullField).to.equal(null);
      });

    });

    it('should query with whereNotNull', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereNotNull('nullField').get();

      expect(results).to.have.length(0);

    });

    it('should query by between', async () => {
      const results: Universal[] = await store.openSession()
        .query<Universal>({
          indexName: 'Universals',
          WaitForNonStaleResults: true
        })
        .whereBetween('order', 1, 5).get();

      expect(results).to.have.lengthOf(5);

      results.map(function (obj, index) {
        index += 1;
        expect(obj).to.include({'name': 'withNesting'});
        expect(obj.order).to.equal(index);

      });

    });

  });
});
