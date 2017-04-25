/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/chai-as-promised/index.d.ts" />

import {expect} from 'chai';
import * as Promise from 'bluebird';
import {DocumentStore} from '../../src/Documents/DocumentStore';
import {IDocumentQuery} from '../../src/Documents/Session/IDocumentQuery';
import {DocumentKey, IDocument} from "../../src/Documents/IDocument";
import {Document} from "../../src/Documents/Document";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {IndexFieldOptions} from "../../src/Database/Indexes/IndexFieldOptions";
import {SortOptions} from "../../src/Database/Indexes/SortOption";
import {IHash} from "../../src/Utility/Hash";

describe('Document query test', () => {
  let store: IDocumentStore;
  let query: IDocumentQuery;
  let session: IDocumentSession;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function (): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IHash));
  });

  beforeEach((done: MochaDone) => {
    store = DocumentStore.create(defaultUrl, defaultDatabase);
    store.initialize();

    const indexMap: string = [
      'from doc in docs ',
      'select new {',
      'name = doc.name,',
      'key = doc.key,',
      'doc_id = doc.key+"_"+doc.name}'
    ].join('');


    const indexSort: IndexDefinition = new IndexDefinition('Testing_Sort', indexMap, null, {
      fields: {
        "key": new IndexFieldOptions(SortOptions.Numeric),
        "doc_id": new IndexFieldOptions(null, null, true)
      }
    });

    store.getRequestsExecutor()
      .execute(new PutIndexesCommand(indexSort))
      .then((): Promise.Thenable<IDocument> => {
        session = store.openSession();

        return Promise.all([
          session.store(session.create({name: 'test101', key: 2, order: 'a'}, 'product'), 'products/101'),
          session.store(session.create({name: 'test10', key: 3, order: 'test'}, 'product'), 'products/10'),
          session.store(session.create({name: 'test106', key: 4, order: 'c'}, 'product'), 'products/106'),
          session.store(session.create({name: 'test107', key: 5, order: null}, 'product'), 'products/107'),
          session.store(session.create({name: 'test107', key: 6, order: null}, 'product'), 'products/103'),
          session.store(session.create({name: 'new_testing', key: 90, order: 'd'}, 'product'), 'products/108'),
          session.store(session.create({
            name: 'testing_order',
            key: 92,
            product_id: 'products/108'
          }, 'order'), 'orders/105'),
          session.store(session.create({
            name: 'withNesting',
            product: {name: 'testing_order', key: 4, order: null}
          }, 'company'), 'company/1')
        ])
        .then(() => done());
      });
  });

  describe('Get()', () => {
    it('should return promise', () => {
      const promise: Promise<IDocument[]> = query.get();

      expect(promise).to.be.instanceof(Promise);
    });

    it('should pass IDocument[] in .then()', (next) => {
      const promise: Promise<IDocument[]>  = query.get();

      promise.then((documents: IDocument[]) => {
        expect(documents.length).to.equals(1);
        expect(documents[0]).to.be.instanceof(Document);
        next();
      })
    });

    it('should support also callbacks', (next) => {
      query.get((documents?: IDocument[], error?: Error) => {
        expect(documents.length).to.equals(1);
        expect(documents[0]).to.be.instanceof(Document);
        next();
      })
    });
  });

  describe('Index checking', () => {
    it('should equal dynamic index', (done: MochaDone) => {
      session = store.openSession();
      session.query().whereEquals('name', 'test101').get().then((results) => {
        expect(results[0].name).to.equals('test101');
        done();
      });
    });

    it('should equal double index', (done: MochaDone) => {
      session = store.openSession();
      session.query().whereEquals('name', 'test101').whereEquals('key', 4).get().then((results) => {
        expect(results).to.have.lengthOf(2);
        done();
      });

      it('should equal double index and operator', (done: MochaDone) => {
        session = store.openSession();
        session.query('product', null, true).whereEquals('name', 'test107').whereEquals('key', 5).get().then((results) => {
          expect(results).to.have.lengthOf(1);
          done();
        });
      });

      it('should be query result in query', (done: MochaDone) => {
        session = store.openSession();
        session.query().whereIn('name', ['test101', 'test107', 'test106']).get().then((results) => {
          expect(results).to.have.lengthOf(4);
          done();
        });
      });

      it('should starts with its name', (done: MochaDone) => {
        session = store.openSession();
        session.query('product').whereStartsWith('name', 'n').get().then((results) => {
          expect(results[0].name).to.be('new_testing');
          done();
        });
      });

      it('should ends with its name', (done: MochaDone) => {
        session = store.openSession();
        session.query('product').whereEndsWith('name', '7').get().then((results) => {
          expect(results[0].name).to.be('test107');
          done();
        });
      });

      it('should fail query with some index', (done: MochaDone) => {
        session = store.openSession();
        session.query(null, 's').where({'tag': 'products'}).get().then((results) => {
          expect(results).should.be.rejected;
          done();
        });
      });

      it('should success query with document', (done: MochaDone) => {
        session = store.openSession();
        session.query().where({'name': 'test101', 'key': [4, 6, 90]}).get().then((results) => {
          expect(results).should.be.fulfilled;
          done();

        });
      });

      it('should success query with index', (done: MochaDone) => {
        session = store.openSession();
        session.query(null, 'Testing_Sort', null, true).where({'key': [4, 6, 90]}).get().then((results) => {
          expect(results).to.have.lengthOf(3);
          done();
        });
      });

      it('should find between result', (done: MochaDone) => {
        session = store.openSession();
        session.query(null, 'Testing_Sort', null, true).whereBetween('key', 2, 4).get().then((results) => {
          expect(results).to.have.lengthOf(1);
          done();
        });
      });

      it('should find between or equal result', (done: MochaDone) => {
        session = store.openSession();
        session.query(null, 'Testing_Sort', null, true).whereBetweenOrEqual('key', 2, 4).get().then((results) => {
          expect(results).to.have.lengthOf(3);
          done();
        });
      });

      it('should be ordered', (done: MochaDone) => {
        session = store.openSession();
        session.query(null, null, null, true).whereNotNull('order').get().then((results) => {
          expect(results[0].order).to.be('a');
          done();
        });
      });

      it('should be ordered descending', (done: MochaDone) => {
        session = store.openSession();
        session.query(null, null, null, true).whereNotNull('order').orderByDescending('order').get().then((results) => {
          expect(results[0].order).to.be('d');
          done();
        });
      });

      it('should not be null', (done: MochaDone) => {
        session = store.openSession();
        session.query(null, null, null, true).whereNotNull('order').get().then((results) => {
          for (let result of results) {
            let foundNull: boolean;
            if (result.order === null) {
              foundNull = true;
            }
            expect(foundNull).to.be.false;
          }
          done();
        });
      });

      it('should include product', (done: MochaDone) => {
        session = store.openSession();
        session.query(null, null, null, true, ['product_id']).where({'key': 92}).get().then(() => {
          (session.load("product/108" as DocumentKey) as Promise<IDocument>)
            .then(() => {
              expect(session.numberOfRequestsInSession).to.equals(1);
              done();
            });
        });
      });

      it('should have nested object', (done: MochaDone) => {
        session = store.openSession();
        session.query('company').whereEquals('name', 'withNesting').get()
          .then((results) => {
            expect(results[0].product).to.equals('product');
            expect(results[0]).to.equals('company')
          })
      });
    });

    it('should make query with fetch terms', (done: MochaDone) => {
      session = store.openSession();
      session.query(null, 'Testing_Sort', null, true).whereBetweenOrEqual('key', 2, 4).search('doc_id')
        .get().then((results: IDocument[]) => {
        for (let result of results) {
          let foundInAll: boolean = true;

          if (result.hasAttribute('doc_id')) {
            foundInAll = false;
          }
          expect(foundInAll).to.be.true;
        }
      });
    });
  })
});

