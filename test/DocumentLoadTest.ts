/// <reference path="../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {DocumentStore} from '../src/Documents/DocumentStore';
import * as Promise from 'bluebird';
import {DocumentKey, IDocument} from "../src/Documents/IDocument";
import {Document} from "../src/Documents/Document";
import {IDocumentStore} from "../src/Documents/IDocumentStore";
import {IDocumentSession} from "../src/Documents/Session/IDocumentSession";
import {ravenServer} from "./config/raven.server";
import {StringUtil} from "../src/Utility/StringUtil";

describe('DocumentSession', () => {
    let store: IDocumentStore;

    beforeEach((done: MochaDone) => {
        store = DocumentStore.create(StringUtil.format('{host}:{port}', ravenServer), ravenServer.dbName);
        store.initialize();

        const session: IDocumentSession = store.openSession();

        Promise.all([
            session.store(new Document({_id: 'products/101', name: 'test'})),
            session.store(new Document({_id: 'products/10', name: 'test'})),
            session.store(new Document({_id: 'orders/105', name: 'testing_order', key: 92, product_id: 'products/101'})),
            session.store(new Document({_id: 'company/1', name: 'test', product: { name: 'testing_nested'}}))
        ]).then(() => done());
    });

    describe('Document Load', () => {
        it('should load existing document', (done: MochaDone) => {
            const session: IDocumentSession = store.openSession();

            (session.load("products/101" as DocumentKey) as Promise<IDocument>)
                .then((document: IDocument) => {
                    expect(document.name).to.equals('test');
                    done();
            });
        });

        it('should not load missing document', (done: MochaDone) => {
            const session: IDocumentSession = store.openSession();

            (session.load("products/0" as DocumentKey) as Promise<IDocument>)
                .then((document: IDocument) => {
                    expect(document.name).to.equals(null);
                    done();
                });
        });

        it('should load few documents', (done: MochaDone) => {
            const session: IDocumentSession = store.openSession();

            (session.load(["products/101"  as DocumentKey,"products/10"  as DocumentKey]) as Promise<IDocument[]>)
                .then((document: IDocument[]) => {
                    expect(document).to.have.lengthOf(2);
                    done();
                });
        });

        it('should load few documents with duplicate id', (done: MochaDone) => {
            const session: IDocumentSession = store.openSession();

            (session.load(["products/101"  as DocumentKey, "products/101"  as DocumentKey, "products/10"  as DocumentKey]) as Promise<IDocument[]>)
                .then((document: IDocument[]) => {
                    expect(document).to.have.lengthOf(3);
                    for (let key of document) {
                        expect(key.name).not.to.equals(null);
                    }
                    done();
                });
        });

        it('should load track entity', (done: MochaDone) => {
            const session: IDocumentSession = store.openSession();

            (session.load("products/101" as DocumentKey) as Promise<IDocument>)
                .then((document: IDocument) => {
                    expect(document).to.be.an.instanceOf(Document);
                    done();
                });
        });

        it('should key of document be an object', (done: MochaDone) => {
            const session: IDocumentSession = store.openSession();

            (session.load("company/1"  as DocumentKey) as Promise<IDocument>)
                .then((document: IDocument) => {
                    expect(document.product).to.be.an('object');
                    expect(document.product).to.be.an.instanceOf(Document);
                    done();
                });
        })

    });
});