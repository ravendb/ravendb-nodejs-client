/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {IDocumentStore} from "../../src/Documents/IDocumentStore";
import {IDocumentSession} from "../../src/Documents/Session/IDocumentSession";
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import RavenTestFixture from "../../test/RavenTestFixture";
import {PatchCommand} from "../../src/Database/Commands/PatchCommand";
import {PatchRequest} from "../../src/Http/Request/PatchRequest";

describe('DocumentSession', () => {
    let store: IDocumentStore;
    let executor: RequestsExecutor = RavenTestFixture.requestsExecutor;
    beforeEach((done: MochaDone) => {
        store.initialize();

        const session: IDocumentSession = store.openSession();
        done()
    });


    describe('Patch request',()=> {
        it('should patch success ignoring missing', (done: MochaDone) => {
            expect(executor.execute(new PatchCommand('product/10', new PatchRequest('testing')))).to.be.null.and.notify(done)
        });

        it('should patch success not ignoring missing', (done: MochaDone) => {
            expect(executor.execute(new PatchCommand('product/10', new PatchRequest('testing'), null, null, true))).to.be.null.and.notify(done)
        });

        it('should patch fail not ignoring missing', (done: MochaDone) => {
            expect(executor.execute(new PatchCommand('product/10', new PatchRequest('testing'), null, null, true))).to.be.rejected().and.notify(done)
        });
    })
});


