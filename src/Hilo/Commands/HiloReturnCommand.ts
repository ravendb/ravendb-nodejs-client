import {ServerNode} from '../../Http/ServerNode';
import {RequestMethods} from '../../Http/Request/RequestMethod';
import {RavenCommand} from '../../Database/RavenCommand';
import {IRavenResponse} from "../../Database/RavenCommandResponse";
import {IResponse} from "../../Http/Response/IResponse";
import {StringUtil} from "../../Utility/StringUtil";

export class HiloReturnCommand extends RavenCommand {
  protected tag: string;
  protected last: number;
  protected end: number;

  constructor(tag: string, last: number, end: number) {
    super('', RequestMethods.Put);
    this.tag = tag;
    this.last = last;
    this.end = end;
  }

  public createRequest(serverNode: ServerNode): void {
    this.params = {tag: this.tag, last: this.last, end: this.end};
    this.endPoint = StringUtil.format('{url}/databases/{database}/hilo/return', serverNode);
  }
}