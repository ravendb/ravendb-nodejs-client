/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {DeleteDocumentCommand} from "../../src/Database/Commands/DeleteDocumentCommand";
import {RavenCommandResponse} from "../../src/Database/RavenCommandResponse";
import {ErrorResponseException, RavenException} from "../../src/Database/DatabaseExceptions";
import RavenTestFixture from "../../test/RavenTestFixture";

describe('DocumentSession', () => {
    let executor: RequestsExecutor = RavenTestFixture.requestsExecutor;
    let response, otherResponse;

    before((done: MochaDone) => {
        executor.execute(new PutDocumentCommand('products/101', {'Name': 'test', '@metadata': {}}))
            .then((result: RavenCommandResponse)=>{
                response = result;

                return executor.execute(new PutDocumentCommand('products/102', {'Name': 'test', '@metadata': {}}));
            })
            .then((result: RavenCommandResponse) => {
                otherResponse = result;
                done();
            })
    });

    describe('Delete()', () => {
                    it('should delete with no etag', () => {
                        let command: DeleteDocumentCommand = new DeleteDocumentCommand('product/10');
                        executor.execute(command).then((result) => {
                            expect(result).not.to.be.null;
                        })
                    });

                    it('should delete with etag', () => {
                        let command2: DeleteDocumentCommand = new DeleteDocumentCommand('products/102', otherResponse.etag);
                        executor.execute(command2).then((result) => {
                            expect(result).not.to.be.null;
                        })
                    });

                    it('should fail delete', () => {
                        executor.execute(new DeleteDocumentCommand('products/101', response.etag + 10))
                            .catch((error: RavenException) => expect(error).to.be.instanceof(ErrorResponseException))
                    })
                })
});
