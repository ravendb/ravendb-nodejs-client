import {IRavenObject} from "../../IRavenObject";
import {RavenCommandData} from "../../RavenCommandData";
import {BatchCommand} from "../BatchCommand";

export class SaveChangesData {
  protected commands: RavenCommandData[];
  protected deferredCommandCount: number;
  protected documents: IRavenObject[];

  public get deferredCommandsCount(): number {
    return this.deferredCommandCount;
  }

  public get commandsCount(): number {
    return this.commands.length;
  }

  constructor(commands?: RavenCommandData[], deferredCommandCount: number = 0, documents?: IRavenObject[]) {
    this.commands = commands || [];
    this.documents = documents || [];
    this.deferredCommandCount = deferredCommandCount;
  }        

  public addCommand(command: RavenCommandData) {
    this.commands.push(command);
  }

  public addDocument(document: IRavenObject) {
    this.documents.push(document);
  }

  public getDocument(index: number): IRavenObject {
    return this.documents[index];
  }

  public createBatchCommand(): BatchCommand {
    return new BatchCommand(this.commands);
  }
}