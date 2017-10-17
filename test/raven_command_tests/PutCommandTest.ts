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
    .execute(new PutDocumentCommand('Testings/1', {'name': 'test', '@metadata': {'@id': 'Testings/1','@collection': 'Testings'}}))
    .then(() => requestExecutor.execute(new GetDocumentCommand('Testings/1')))
    .then((result: IRavenResponse) => expect(result.Results[0]['@metadata']['@id']).to.equals('Testings/1'))
  );

  it('should fail with invalid json', async() => expect(
      requestExecutor.execute(new PutDocumentCommand('Testings/2', <any>'document'))
    ).to.be.rejected
  );
});
