/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";
import {IRavenResponse, IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {IHash} from "../../src/Utility/Hash";

describe('Put command tets', () => {
  let requestsExecutor: RequestsExecutor;

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IHash);
  });

  it('should put successfully', (done: MochaDone) => {
    requestsExecutor.execute(new PutDocumentCommand('testing/1', {'name': 'test', '@metadata': {}}))
      .then(() => requestsExecutor.execute(new GetDocumentCommand('testing/1')))
      .then((result: IRavenResponse) => {
        expect((result as IRavenResponse).Results[0]['@metadata']['@id']).to.equals('testing/1');
        done();
      });
  });

  it('should fail with invalid json', (done: MochaDone) => {
    expect(requestsExecutor.execute(new PutDocumentCommand('testing/2', 'document' as Object))).to.be.rejected.and.notify(done);
  });
});
