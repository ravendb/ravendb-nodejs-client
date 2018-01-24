import {RequestExecutor, IRequestExecutor} from "./RequestExecutor";
import {RavenCommand} from "../../Database/RavenCommand";
import {GetClusterTopologyCommand} from "../../Database/Commands/GetClusterTopologyCommand";
import {IRequestAuthOptions} from "../../Auth/AuthOptions";

export class ClusterRequestExecutor extends RequestExecutor {
  public static create(urls: string[], authOptions?: IRequestAuthOptions): IRequestExecutor {
    return super.create(urls, null, authOptions);
  }

  public static createForSingleNode(url: string, authOptions?: IRequestAuthOptions): IRequestExecutor {
    return super.createForSingleNode(url, null, authOptions);
  }

  protected getUpdateTopologyCommandClass(): new() => RavenCommand {
    return GetClusterTopologyCommand;
  }
}