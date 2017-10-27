/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/sinon/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";

describe('DocumentMetaData test', () => {
  let store: IDocumentStore;
  let session: IDocumentSession;
  let requestExecutor: RequestExecutor;
  let currentDatabase: string, defaultUrl: string;

  beforeEach(function (): void {
    ({currentDatabase, defaultUrl, requestExecutor, store} = (this.currentTest as IRavenObject));
  });

  describe('Metadata save', () => {

    it('should store document with metadata', async () => {

      const expiresAt = new Date(new Date().getTime() + (1 * 60000));
      const testDocumentId = 'TestExpirationDocument';
      session = store.openSession();
      await session.store({
        firstName: 'Delete',
        lastName: 'Me',
        email: 'delete.me@test.com',
        password: 'TestPassword',
        seeIsoFormatTemp: expiresAt.toISOString(),
        '@metadata': {
          '@expires': expiresAt.toISOString(),
        },
      }, testDocumentId);

      await session.saveChanges();
      const document = await session.load(testDocumentId);
      const documentMetaData = document['@metadata'];

      expect(documentMetaData['@expires']).to.not.be.undefined;
      expect(documentMetaData['@expires']).to.equal(expiresAt.toISOString());
    });

  });

});