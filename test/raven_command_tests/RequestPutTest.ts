/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {RequestMethod} from "../../src/Http/Request/RequestMethod";
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {RequestsExecutor} from "../../src/Http/Request/RequestsExecutor";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";

describe('DocumentSession', () => {
  let executor: RequestsExecutor;
  it('should put success', (done: MochaDone) => {
    executor.execute(new PutDocumentCommand('testing/1',{'name': 'test', '@metadata': {}}))
      .then(() => {
          executor.execute(new GetDocumentCommand('testing/1'))
            .then((result) => {
              expect(result['Results'][0]['@metadata']['@id']).to.equals('testing/1');
              done();
            })
      })
  });

  it('should put fail', (done: MochaDone) => {
      executor.execute(new PutDocumentCommand('testing/2', {}))
          .then(() => {
              done();
          })
  });

});
