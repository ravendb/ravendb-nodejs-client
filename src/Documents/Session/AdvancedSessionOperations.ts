import {DocumentSession} from './DocumentSession';
import {RequestExecutor} from '../../Http/Request/RequestExecutor';
import {DocumentQueryParameters, RawDocumentQuery} from './DocumentQuery';
import {IDocumentQueryBase, IRawDocumentQuery, IDocumentQueryOptions} from './IDocumentQuery';
import {TypeUtil} from '../../Utility/TypeUtil';
import {IRavenObject} from '../../Typedef/IRavenObject';
import {ConditionValue} from "./Query/QueryLanguage";
import {Observable} from "../../Utility/Observable";

export class AdvancedSessionOperations extends Observable {
  protected session: DocumentSession;
  protected requestExecutor: RequestExecutor;

  constructor(session: DocumentSession, requestExecutor: RequestExecutor) {
    super();
    this.session = session;
    this.requestExecutor = requestExecutor;
  }

  public rawQuery<T extends Object = IRavenObject>(query: string, params?: IRavenObject<ConditionValue> | DocumentQueryParameters, 
    options?: IDocumentQueryOptions<T>
  ): IRawDocumentQuery<T> {
    const rawQuery: IRawDocumentQuery<T> = RawDocumentQuery.create<T>(this.session, this.requestExecutor, options);

    rawQuery.rawQuery(query);
    
    if (!TypeUtil.isNull(params)) {
      let queryParams: IRavenObject<ConditionValue> = <IRavenObject<ConditionValue>>params;

      if (params instanceof DocumentQueryParameters) {
        queryParams = (params as DocumentQueryParameters).toJson() as IRavenObject<ConditionValue>;
      }

      for (let param in queryParams) {
        rawQuery.addParameter(param, params[param]);
      }
    }

    this.emit<IDocumentQueryBase<T>>(DocumentSession.QUERY_INITIALIZED, <IDocumentQueryBase<T>>rawQuery);

    return rawQuery;
  }
}