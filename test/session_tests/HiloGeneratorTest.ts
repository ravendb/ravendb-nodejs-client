/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />
/// <reference path="../../node_modules/@types/sinon/index.d.ts" />

import {expect} from 'chai';
import * as Sinon from 'sinon';
import {DocumentType, DocumentConstructor} from "../../src/Documents/Conventions/DocumentConventions";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {IRavenObject} from "../../src/Typedef/IRavenObject";
import {HiloRangeValue} from "../../src/Hilo/HiloRangeValue";
import {HiloNextCommand} from "../../src/Hilo/Commands/HiloNextCommand";
import {TypeUtil} from "../../src/Utility/TypeUtil";
import {Product} from "../TestClasses";

describe('HiLo generator test', () => {
  let store: IDocumentStore;
  let currentDatabase: string;
  let requestNextRange: Sinon.SinonSpy;

  const range = (documentType: DocumentType): HiloRangeValue => {
    const tag: string = store.conventions.getCollectionName(documentType);

    return <HiloRangeValue>store['_generator']
      ['generators'][currentDatabase]
      ['generators'][tag]['_range'];
  };

  const idIndex = (id: string, documentType: DocumentType): number => {
    if (TypeUtil.isFunction(documentType)) {
      documentType = (<DocumentConstructor>documentType).name;
    }

    return parseInt(id.replace('-A', '').replace(<string>documentType + '/', ''));
  }

  beforeEach(function (): void {
    ({currentDatabase, store} = (this.currentTest as IRavenObject));
    requestNextRange = Sinon.spy(HiloNextCommand.prototype, 'createRequest');     
  });

  describe('HiLo', () => {
    it('should starts from 1', async () => {
      let id: string = await store.generateId({}, Product);

      expect(id).to.equals('Products/1-A');
    });
    
    it('should increments by 1', async () => {
      let id: string;
      let prevId: string;

      do {
        id = await store.generateId({}, Product);

        if (prevId) {
          expect(idIndex(id, Product) - idIndex(prevId, Product)).to.equals(1);
        }

        prevId = id;
      } while (!range(Product).needsNewRange);
    });

    it('should requests new range', async () => {
      let maxId: number;
      
      do {
        await store.generateId({}, Product);

        if (!maxId) {
          maxId = range(Product).maxId;
        }

      } while (!range(Product).needsNewRange);

      await store.generateId({}, Product);

      expect(range(Product).minId).to.be.greaterThan(maxId);
      expect(requestNextRange.callCount).to.equals(2);
    });
  });

  afterEach(function (): void {
    requestNextRange.restore();
  });
});

