/// <reference path="../../node_modules/@types/mocha/index.d.ts" />
/// <reference path="../../node_modules/@types/chai/index.d.ts" />

import {expect} from 'chai';
import {PutDocumentCommand} from "../../src/Database/Commands/PutDocumentCommand";
import {RequestExecutor} from "../../src/Http/Request/RequestExecutor";
import {GetDocumentCommand} from "../../src/Database/Commands/GetDocumentCommand";
import {IRavenResponse} from "../../src/Database/RavenCommandResponse";
import {IRavenObject} from "../../src/Typedef/IRavenObject";

describe('Put command tests', () => {
  let requestExecutor: RequestExecutor;

  beforeEach(function(): void {
    ({requestExecutor} = this.currentTest as IRavenObject);
  });

  it('should put successfully', async() => requestExecutor
    .execute(new PutDocumentCommand('testing/1', {'name': 'test', '@metadata': {'@id': 'testing/1','@collection': 'testings'}}))
    .then(() => requestExecutor.execute(new GetDocumentCommand('testing/1')))
    .then((result: IRavenResponse) => expect(result.Results[0]['@metadata']['@id']).to.equals('testing/1'))
  );

  it('should fail with invalid json', async() => expect(
      requestExecutor.execute(new PutDocumentCommand('testing/2', <any>'document'))
    ).to.be.rejected
  );
});
