/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import * as Promise from 'bluebird';
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {RavenCommandResponse, IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";
import {IHash} from "../../src/Utility/Hash";

describe('DocumentSession', () => {
  let requestsExecutor: RequestsExecutor;
  let putCommand: PutDocumentCommand, otherPutCommand: PutDocumentCommand;
  let response: IRavenResponse, otherResponse: IRavenResponse;

  beforeEach(function(): void {
    ({requestsExecutor} = this.currentTest as IHash);
  });

  beforeEach((done: MochaDone) => {
    putCommand = new PutDocumentCommand('products/101', {'Name': 'test', '@metadata': {}});
    otherPutCommand = new PutDocumentCommand('products/10', {'Name': 'test', '@metadata': {}});

    Promise.all([
      requestsExecutor.execute(putCommand)
        .then(() => requestsExecutor
          .execute(new GetDocumentCommand('products/101'))
        )
        .then((result: RavenCommandResponse) => response = result as IRavenResponse),
      requestsExecutor.execute(otherPutCommand)
        .then(() => requestsExecutor
          .execute(new GetDocumentCommand('products/10'))
        )
        .then((result: RavenCommandResponse) => otherResponse = result as IRavenResponse)
    ])
    .then(() => done());
  });

  describe('Get()', () => {
    it('should equal', () => {
      expect(response.Results[0]['@metadata']['@id']).to.equals('products/101')
    });

    it('should not equal', () => {
      expect(response.Results[0]['@metadata']['@id']).not.to.equals(otherResponse.Results[0]['@metadata']['@id'])
    });

    it('should be null', () => {
      requestsExecutor.execute(new GetDocumentCommand('product')).then((result) => {
        expect(result).to.be.null;
      })
    })
  })
});

