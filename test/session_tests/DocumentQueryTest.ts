/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/chai-as-promised/index.d.ts" />

import {expect} from 'chai';
import * as _ from 'lodash';
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {Product, Universal, UniversalsTestingSort} from "../TestClasses";
import {QueryBuilder} from "../../src/Documents/Session/Query/QueryBuilder";
import {IDocumentQuery} from "../../src/Documents/Session/IDocumentQuery";

describe('Document query test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let currentDatabase: string, defaultUrl: string;

  beforeEach(function (): void {
    ({currentDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {

    const UniversalsTestingSorts: UniversalsTestingSort = new UniversalsTestingSort(store);

    session = store.openSession();

    await UniversalsTestingSorts.execute();
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
      const query: IDocumentQuery<Universal> = store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereEqualsAndOr<number>('name', 'withNesting', 'order', 3, 'order', 4);

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE name='withNesting' AND ( order='3' ) OR order='4'`);

      expect(results).to.have.lengthOf(2);

      results.map(function (obj) {

        expect(obj).to.include({'name': 'withNesting'});

      });

    });

    it('should query with orderBy as long', async () => {

      const query: IDocumentQuery<Universal> = store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .orderBy('order as long', 'ASC');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort ORDER BY order as long ASC`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj, index) {
        index += 1;
        expect(obj.order).to.be.equal(index);
      });

    });

    it('should query with orderBy as string', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({
          indexName: 'UniversalsTestingSort',
          WaitForNonStaleResults: true
        })
        .orderBy('order', 'ASC');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort ORDER BY order ASC`);

      expect(results[1].order).to.be.equal(10);

      let expectedArray = [1, 10, 2, 3, 4, 5, 6, 7, 8, 9];

      results.map(function (obj, index) {
        expect(obj.order).to.be.equal(expectedArray[index]);
      });

    });

    it('should query with orderByDESC as long', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .orderBy('order as long', 'DESC');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort ORDER BY order as long DESC`);

      expect(results).to.have.lengthOf(10);

      results.reverse().map(function (obj, index) {
        index += 1;
        expect(obj.order).to.be.equal(index);
      });

    });

    it('should query with whereGreaterThanOrEqual', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereGreaterThanOrEqual<number>('order', 6);

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE order>=6`);

      expect(results).to.have.lengthOf(5);

      results.map(function (obj) {

        expect(obj.order).to.not.be.lessThan(6);
        expect(obj.order).to.be.greaterThan(5);

      });

    });

    it('should query with whereLessThanOrEqual', async () => {
      const query: IDocumentQuery<Universal> = await  store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereLessThanOrEqual<number>('order', 6);

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE order<=6`);

      expect(results).to.have.lengthOf(6);

      results.map(function (obj) {

        expect(obj.order).to.not.be.greaterThan(6);
        expect(obj.order).to.be.lessThan(7);

      });

    });

    it('should query with nested objects exact', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', nestedObjectTypes: {product: Product}, WaitForNonStaleResults: true})
        .whereEquals<string>('name', 'withnesting', true);

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE exact(name='withnesting')`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
        expect(obj.product.name).to.equal('testing_order');
      });

    });

    it('should query with nested objects', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', nestedObjectTypes: {product: Product}, WaitForNonStaleResults: true})
        .whereEquals<string>('name', 'withNesting');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE name='withNesting'`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
        expect(obj.product.name).to.equal('testing_order');
      });

    });

    it('should make query with fetch terms', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({WaitForNonStaleResults: true, indexName: 'UniversalsTestingSort'})
        .selectFields<string>('id');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT id FROM INDEX UniversalsTestingSort`);

      expect(results).to.have.lengthOf(10);
      expect(_.every(results, (result: Product) => result.hasOwnProperty('id'))).to.be.true;

    });

    it('should query with whereArray and orElse', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .where({name: ['withNesting', 'anotherIndex']});

      const results: Universal[] = await query.get();
      const getOR: IDocumentQuery<Universal> = await query.orElse();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE name='withNesting,anotherIndex' OR name='withNesting' OR name='anotherIndex'`);

      expect(getOR['_builder']).to.be.instanceOf(QueryBuilder);
      expect(getOR['_builder']._nextOperator).to.equal('OR');
      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj).to.include({'name': 'withNesting'});
      });

    });

    it('should query with where', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .where({name: 'withNesting'});

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE name IN ('withNesting')`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj).to.include({'name': 'withNesting'});
      });

    });

    it('should fail query with non-existing index', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'none'})
        .whereIn<string>('Tag', 'Products');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX none WHERE Tag IN ('Products')`);

      expect(results).to.have.lengthOf(0);

    });

    it('should query by @all_docs', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({WaitForNonStaleResults: true})
        .whereIn<string>('name', 'withNesting');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM @all_docs WHERE name IN ('withNesting')`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
      });

    });

    it('should paginate', async () => {
      const pageSize: number = 2;

      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereIn<string>('name', 'withNesting');

      const totalCount: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE name IN ('withNesting')`);

      const totalPages: number = Math.ceil(totalCount.length / pageSize);

      totalCount.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
      });

      expect(totalCount).to.have.lengthOf(10);
      expect(totalPages).to.equals(5);

    });

    it('should query with whereEquals', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereEquals<string>('name', 'withNesting');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE name='withNesting'`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
      });

    });

    it('should query with whereIn', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereIn<string>('name', 'withNesting');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE name IN ('withNesting')`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.name).to.equal('withNesting');
      });

    });

    it('should query with whereGreaterThan', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereGreaterThan<number>('order', 2);

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE order > 2`);

      expect(results).to.have.lengthOf(8);

      results.map(function (obj) {
        expect(obj.order).to.not.be.lessThan(2);
        expect(obj.order).to.be.greaterThan(2);
      });

    });

    it('should query with whereLessThan', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereLessThan<number>('order', 6);

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE order < 6`);

      expect(results).to.have.lengthOf(5);

      results.map(function (obj) {
        expect(obj.order).to.not.be.greaterThan(6);
        expect(obj.order).to.be.lessThan(6);
      });

    });

    it('should query with whereLessThan with :p', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({
          indexName: 'UniversalsTestingSort',
          WaitForNonStaleResults: true,
          queryParameters: {
            "p0": 6
          }
        })
        .whereLessThan<string>('order', ':p0');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE order < :p0`);

      expect(results).to.have.lengthOf(5);

      results.map(function (obj) {
        expect(obj.order).to.not.be.greaterThan(6);
        expect(obj.order).to.be.lessThan(6);
      });

    });

    it('should query by startsWith', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({
          indexName: 'UniversalsTestingSort',
          WaitForNonStaleResults: true
        })
        .startsWith<string>('name', 'wi');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE startsWith(name, 'wi')`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj).to.include({'name': 'withNesting'});
        expect(obj.name).to.contain('wi');
      });

    });

    it('should query by endsWith', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({
          indexName: 'UniversalsTestingSort',
          WaitForNonStaleResults: true
        })
        .endsWith<string>('name', 'ing');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE endsWith(name, 'ing')`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj).to.include({'name': 'withNesting'});
        expect(obj.name).to.contain('ing');
      });

    });

    it('should query by search', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({
          indexName: 'UniversalsTestingSort',
          WaitForNonStaleResults: true
        })
        .search('name', 'withNesting');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE search(name, 'withNesting')`);

      expect(results).to.have.lengthOf(10);

      expect(results[0].order).to.be.equal(1);
      expect(results[0]).to.include({'name': 'withNesting'});

    });

    it('should query by whereIn', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({
          indexName: 'UniversalsTestingSort',
          WaitForNonStaleResults: true
        })
        .whereIn<string>('name', 'withNesting');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE name IN ('withNesting')`);

      expect(results).to.have.lengthOf(10);

      expect(results[0].order).to.be.equal(1);
      expect(results[0]).to.include({'name': 'withNesting'});

    });

    it('should query with selectFields', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({
          indexName: 'UniversalsTestingSort',
          WaitForNonStaleResults: true
        })
        .selectFields<string>('id');

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT id FROM INDEX UniversalsTestingSort`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj, index) {
        index += 1;
        expect(obj['__document_id']).to.contain(`Universals_${index}`);
      });

    });

    it('should query with selectFields without field', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({
          indexName: 'UniversalsTestingSort',
          WaitForNonStaleResults: true
        })
        .selectFields<string>();

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj, index) {
        index += 1;
        expect(obj['id']).to.contain(`Universals_${index}`);
      });

    });

    it('should query with whereIsNull', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({
          indexName: 'UniversalsTestingSort',
          WaitForNonStaleResults: true
        })
        .whereIsNull<null>('nullField', null);

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE nullField=null`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {
        expect(obj.nullField).to.equal(null);
      });

    });

    it('should query with whereNotNull and NOT', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereNotNull('nullField');

      const results: Universal[] = await query.get();
      const getNOT: IDocumentQuery<Universal> = await query.negateNext();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE nullField=null AND NOT nullField=null`);

      expect(getNOT['_builder']).to.be.instanceOf(QueryBuilder);
      expect(getNOT['_builder']._negateNext).to.equal(true);

      expect(results).to.have.length(0);

    });

    it('should query by between and andAlso', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .whereBetween<number>('order', 1, 5);

      const results: Universal[] = await query.get();
      const getAND: IDocumentQuery<Universal> = await query.andAlso();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE order BETWEEN 1 AND 5`);

      expect(getAND['_builder']).to.be.instanceOf(QueryBuilder);
      expect(getAND['_builder']._nextOperator).to.equal('AND');

      expect(results).to.have.lengthOf(5);

      results.map(function (obj, index) {
        index += 1;
        expect(obj).to.include({'name': 'withNesting'});
        expect(obj.order).to.equal(index);

      });

    });

    it('should query with where', async () => {
      const query: IDocumentQuery<Universal> = await store
        .openSession()
        .query<Universal>({indexName: 'UniversalsTestingSort', WaitForNonStaleResults: true})
        .where({name: 'withNesting'});

      const results: Universal[] = await query.get();
      const queryString: string = await query['_builder'].getRql();

      expect(queryString).equals(`SELECT * FROM INDEX UniversalsTestingSort WHERE name IN ('withNesting')`);

      expect(results).to.have.lengthOf(10);

      results.map(function (obj) {

        expect(obj).to.include({'name': 'withNesting'});

      });
    });

  });
});
