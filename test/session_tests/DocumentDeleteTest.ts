/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {DocumentStore} from "../../src/Documents/DocumentStore";
import {StringUtil} from "../../src/Utility/StringUtil";
import {ravenServer} from "./config/raven.server";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import * as Promise from 'bluebird'
import {Document} from "../../src/Documents/Document";
import {DocumentKey, IDocument} from "../../src/Documents/IDocument";

describe('Document session', () => {
    let store: IDocumentStore;

    beforeEach((done: MochaDone) => {
        store = DocumentStore.create(StringUtil.format('{host}:{port}', ravenServer), ravenServer.dbName);
        store.initialize();

        const session: IDocumentSession = store.openSession();

        Promise.all([
            session.store(session.create({_id: 'products/101', name: 'test'},'product')),
            session.store(session.create({_id: 'products/10', name: 'test'},'product')),
            session.store(session.create({_id: 'products/106', name: 'test'},'product')),
            session.store(session.create({_id: 'products/107', name: 'test'},'product'))
        ]).then(() => done())
    });

    describe('Document delete', () => {
        it('should delete with key and save session', (done: MochaDone) => {
            let session: IDocumentSession = store.openSession();

            (session.delete("products/101" as DocumentKey) as Promise<IDocument>)
                .then(() => {
                    session = store.openSession();
                    (session.load("products/101" as DocumentKey) as Promise<IDocument>)
                        .then((document: IDocument) => {
                            expect(document).not.to.exist;
                            done();
                        });
                });
        });

        it('should delete after change',(done: MochaDone) => {
            let session: IDocumentSession = store.openSession();

            (session.load("products/106" as DocumentKey) as Promise<IDocument>)
                .then((document: IDocument) => {
                    document.name = 'testing';
                    session = store.openSession();
                    (session.delete("products/106" as DocumentKey) as Promise<IDocument>)
                        .then(() => {
                            session = store.openSession();
                            (session.load("products/106" as DocumentKey) as Promise<IDocument>)
                                .then((document: IDocument) => {
                                    expect(document).not.to.exist;
                                    done();
                                });
                    })
                })
        });
    })
});