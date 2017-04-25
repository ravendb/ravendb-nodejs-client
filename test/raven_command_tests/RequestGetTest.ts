/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {DeleteDocumentCommand} from "../../src/Database/Commands/DeleteDocumentCommand";
import {RavenCommandResponse} from "../../src/Database/RavenCommandResponse";
import {ErrorResponseException, RavenException} from "../../src/Database/DatabaseExceptions";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";
import RavenTestFixture from "../../test/RavenTestFixture";

describe('DocumentSession', () => {
    let executor: RequestsExecutor = RavenTestFixture.requestsExecutor;
    let putCommand, otherPutCommand, response, otherResponse;

    before((done: MochaDone) => {
        executor.execute(new PutDocumentCommand('products/101', {'Name': 'test', '@metadata': {}}))
            .then((result: RavenCommandResponse)=>{
                putCommand = result;

                return executor.execute(new PutDocumentCommand('products/10', {'Name': 'test', '@metadata': {}}));
            })
            .then((result: RavenCommandResponse) => {
                otherPutCommand = result;

                return executor.execute(new GetDocumentCommand('products/101'))
                    .then((result) => {
                        response = result;
                        return executor.execute(new GetDocumentCommand('products/10')).then((result) => {
                            otherResponse = result;
                            done()
                        })
                    })
            })
    });

    describe('Get()', () => {

        it('should equal', () => {
            expect(response['Results'][0]['@metadata']['@id']).to.equals('products/101')
        });

        it('should not equal', () => {
            expect(response['Results'][0]['@metadata']['@id']).not.to.equals(otherResponse['Results'][0]['@metadata']['@id'])
        });

        it('should be null', () => {
            executor.execute(new GetDocumentCommand('product')).then((result) => {
                expect(result).not.to.be.null
            })
        })
    })
});

