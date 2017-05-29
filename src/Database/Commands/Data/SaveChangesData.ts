import {IRavenObject} from "../../IRavenObject";
import {RavenCommand} from "../../RavenCommand";
import {RavenCommandData} from "../../RavenCommandData";

export class SaveChangesData {
  protected commands: RavenCommand[];
  protected deferredCommandCount: number;
  protected entities: IRavenObject[];

  constructor(commands?, deferredCommandCount: number = 0, entities?: IRavenObject[]) {
    this.commands = commands || [];
    this.entities = entities || [];
    this.deferredCommandCount = deferredCommandCount;
  }        
}