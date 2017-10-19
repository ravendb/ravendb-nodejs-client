/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/sinon/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {NotSupportedException} from "../../src/Database/DatabaseExceptions";

describe('Authentication test', () => {

  describe('Auth', () => {

    it('should raise NotSupportedException when trying to connect to secured server', async () => {
      expect((): void => {
        const store: IDocumentStore = DocumentStore.create(
          'https://secured.db.somedomain.com', 'SomeDatabase'
        );

        store.initialize();
      }).to.throw(NotSupportedException);
    });  

  });  

});

