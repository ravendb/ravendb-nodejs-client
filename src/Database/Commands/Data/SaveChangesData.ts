import {IRavenObject} from "../../IRavenObject";
import {RavenCommandData} from "../../RavenCommandData";

export class SaveChangesData {
  protected commands: RavenCommandData[];
  protected deferredCommandCount: number;
  protected entities: IRavenObject[];

  constructor(commands?: RavenCommandData[], deferredCommandCount: number = 0, entities?: IRavenObject[]) {
    this.commands = commands || [];
    this.entities = entities || [];
    this.deferredCommandCount = deferredCommandCount;
  }        

  public addCommand(command: RavenCommandData) {
    this.commands.push(command);
  }

  public addEntity(entity: IRavenObject) {
    this.entities.push(entity);
  }
}