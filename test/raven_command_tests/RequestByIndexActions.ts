/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import * as Promise from 'bluebird';
import {expect} from 'chai';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import RavenTestFixture from "../../test/RavenTestFixture";
import {PutDocumentCommand, PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {RavenCommandResponse} from "../../src/Database/RavenCommandResponse";
import {IndexDefinition} from "../../src/Database/Indexes/IndexDefinition";
import {IndexFieldOptions} from "../../src/Database/Indexes/IndexFieldOptions";
import {SortOptions} from "../../src/Database/Indexes/SortOption";
import {PutIndexesCommand} from "../../src/Database/Commands/PutIndexesCommand";
import {PatchRequest, PatchRequest} from "../../src/Http/Request/PatchRequest";
import {Document} from "../../src/Documents/Document";
import {IDocumentQuery} from "../../src/Documents/Session/IDocumentQuery";
import {QueryCommand} from "../../src/Database/Commands/QueryCommand";
import {IndexQuery} from "../../src/Database/Indexes/IndexQuery";
import {DocumentConventions} from "../../src/Documents/Conventions/DocumentConventions";
import {QueryOperationOptions} from "../../src/Database/Operations/QueryOperationOptions";

describe('DocumentSession', () => {

    let executor: RequestsExecutor = RavenTestFixture.requestsExecutor;
    let query : IDocumentQuery;
    let response, otherResponse;

    before((done: MochaDone) => {

        const indexMap: string = "from doc in docs.Testings  select new {Name = doc.Name,DocNumber = doc.DocNumber}";
        const indexDefinition: IndexDefinition = new IndexDefinition('Testing_Sort', indexMap, null, {
            fields: {
                "DocNumber": new IndexFieldOptions(SortOptions.Numeric)
            }
        });
        const patch: PatchRequest = new PatchRequest("Name = 'Patched';");
        executor.execute(new PutIndexesCommand(indexDefinition))
            .then((result: RavenCommandResponse)=>{
                response = result;
                let putCommand: any;
                for(let i= 0; i<100; i++) {
                    let command: PutDocumentCommand;
                    command = new PutDocumentCommand("testing/" + i,{"Name": "test" + i, "DocNumber": i, "@metadata": {"@collection": "Testings"}});
                    putCommand.push(command);
                    return Promise.all(putCommand)
                }
                executor.execute(putCommand).then(() => {
                    done()
                })
            })
        });


        describe('Actions by Index', () => {

            it('should update with index to success', () => {
                executor.execute(new QueryCommand('Testing_Sort', new IndexQuery('Name:*'), new DocumentConventions())).then(() => {
                    executor.execute(new PatchRequest('Testing_sort', {IndexQuery('Name:*'),/* what patch?*/,new QueryOperationOptions(false)}))
                    .then((result) => {
                        expect(result).not.to.be.null;
                        expect(result['Result']['Total']).to.be.at.least(50)
                    })
                })
            });

            it('should update with index to fail', () => {
                executor.execute(new PatchRequest('', {IndexQuery('Name:test'),/* what patch?*/}))
                    .then((result) => {
                        expect(result).should.be.rejected;
                    })

            });

            it('should delete with index to fail', () => {
                executor.execute(new /* where is method delete by index?*/('region2', new IndexQuery('Name:Western')))
                    .then((result) => {
                        expect(result).should.be.rejected;
                    })
            });

            it('should delete with index to success', () => {
                executor.execute(new QueryCommand('Testing_Sort', new IndexQuery('DocNumber_D_Range:[0 TO 49]',/*wait_for_non_stale_results=True*/), new DocumentConventions()))
                    .then((result) => {
                        executor.execute(new /* where is method delete by index?*/('Testing_Sort', new IndexQuery('DocNumber_D_Range:[0 TO 49]'), new QueryOperationOptions(false)))
                            .then((result) => {
                                expect(result).to.be.fulfilled
                            })
                    })
            });
        });
});
