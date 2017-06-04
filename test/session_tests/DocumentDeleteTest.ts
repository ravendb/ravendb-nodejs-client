/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import * as BluebirdPromise from 'bluebird';
import {IRavenObject} from "../../src/Database/IRavenObject";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {Product} from "../BaseTest";

describe('Document delete test', () => {
  let store: IDocumentStore;
  let defaultDatabase: string, defaultUrl: string;

  beforeEach(function(): void {
    ({defaultDatabase, defaultUrl} = (this.currentTest as IRavenObject));
  });

  beforeEach(async () => {
    store = DocumentStore.create(defaultUrl, defaultDatabase);
    store.initialize();

    await store.openSession(async (session: IDocumentSession) => {
      for (let id of [101, 10, 106, 107]) {
        let product: Product = new Product(`products/${id}`, 'test');

        await session.store<Product>(session.create<Product>(product));
      }
    });
  });

  describe('Document delete', () => {
    it('should delete with key with save session', async() => {
      const key: string = "products/101";

      await store.openSession(async (session: IDocumentSession) => {
        await session.delete<Product>(key);
        await session.saveChanges();

        const product: Product = await session.load<Product>(key, Product);

        expect(product).to.not.exist;
      });
    });

    it('should delete with key with save session', async() => {
      const key: string = "products/10";

      await store.openSession(async (session: IDocumentSession) => {
        await session.delete<Product>(key);

        const product: Product = await session.load<Product>(key, Product);

        expect(product).to.not.exist;
      });
    });

    it('should fail trying delete document by key after it has been changed', async() => {
      const key: string = "products/106";

      await expect(store.openSession(async (session: IDocumentSession) => {
        let product: Product = await session.load<Product>(key, Product);
        product.name = "testing";

        await session.delete<Product>(key);
      })).to.be.rejected;
    });

    it('should delete document after it has been changed and save session', async() => {
      const key: string = "products/107";

      await store.openSession(async (session: IDocumentSession) => {
        let product: Product = await session.load<Product>(key, Product);

        product.name = "testing";
        await session.delete<Product>(product);
        await session.saveChanges();
        product = await session.load<Product>(key, Product);

        expect(product).to.not.exist;
      });
    });
  })
});