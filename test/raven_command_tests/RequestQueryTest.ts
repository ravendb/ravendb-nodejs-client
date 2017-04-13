/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {DocumentQuery} from "../../src/Documents/Session/DocumentQuery";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";

describe('DocumentSession', () => {
    let executor: RequestsExecutor;
    let query: DocumentQuery;


    beforeEach((done: MochaDone) => {
        executor.execute(new PutDocumentCommand('products/10', {'Name': 'test', '@metadata': {'@collection': 'Products'}}))
            .then(() => {
               done();
            });
    });

    describe('Query Command', () => {

        it('should do only query', (done: MochaDone) => {
            executor.execute(new PutIndexesCommand(/*index???*/)).then(() => {
                executor.execute(new QueryCommand('Testing', new IndexQuery('Tag: Products'), new DocumentConventions(???))).then((result) => {
                    expect(result["Results"][0]["Name"]).to.equals('test');
                    done()
                });
            });
        });

        it('should get only metadata', (done: MochaDone) => {
            executor.execute(new PutIndexesCommand(/*index???*/)).then(() => {
                executor.execute(new QueryCommand('Testing', new IndexQuery('Tag: Products'), new DocumentConventions(???), null, true)).then((result) => {
                    expect(result["Results"][0]).not.to.include('Name');
                    done()
                });
            });
        });

        it('should get only index entries', (done: MochaDone) => {
            executor.execute(new PutIndexesCommand(/*index???*/)).then(() => {
                executor.execute(new QueryCommand('Testing', new IndexQuery('Tag: Products'), new DocumentConventions(???), null, true)).then((result) => {
                    expect(result["Results"][0]["Name"]).not.to.include('@metadata');
                    done()
                });
            });
        });

        it('should fail', (done: MochaDone) => {
           expect(executor.execute(new QueryCommand(null, new IndexQuery('Tag: Products'), new DocumentConventions(???)))).should.be.rejected.and.notify(done)
        });

        it('should fail with null response', (done: MochaDone) => {
            expect(executor.execute(new QueryCommand('IndexIsNotExists', new IndexQuery('Tag: Products'), new DocumentConventions(???)))).should.be.rejected.and.notify(done)
        });

    });
});

