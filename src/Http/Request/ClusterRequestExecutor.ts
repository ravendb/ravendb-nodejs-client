import {RequestExecutor, IRequestExecutor} from "./RequestExecutor";
import {RavenCommand} from "../../Database/RavenCommand";
import {GetClusterTopologyCommand} from "../../Database/Commands/GetClusterTopologyCommand";

export class ClusterRequestExecutor extends RequestExecutor {
  public static create(urls: string[]): IRequestExecutor {
    return super.create(urls, null);
  }

  public static createForSingleNode(url: string): IRequestExecutor {
    return super.createForSingleNode(url, null);
  }

  protected getUpdateTopologyCommandClass(): new() => RavenCommand {
    return GetClusterTopologyCommand;
  }
}