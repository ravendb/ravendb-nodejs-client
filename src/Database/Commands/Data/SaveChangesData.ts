import {IRavenObject} from "../../IRavenObject";
import {RavenCommandData} from "../../RavenCommandData";
import {BatchCommand} from "../BatchCommand";

export class SaveChangesData {
  protected commands: RavenCommandData[];
  protected deferredCommandCount: number;
  protected entities: IRavenObject[];

  public get deferredCommandsCount(): number {
    return this.deferredCommandCount;
  }

  public get commandsCount(): number {
    return this.commands.length;
  }

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

  public createBatchCommand(): BatchCommand {
    return new BatchCommand(this.commands);
  }
}