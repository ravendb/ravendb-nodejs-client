import {RequestExecutor} from "./RequestExecutor";
import {RavenCommand} from "../../Database/RavenCommand";
import {GetClusterTopologyCommand} from "../../Database/Commands/GetClusterTopologyCommand";

export class ClusterRequestExecutor extends RequestExecutor {
  public static create(urls: string[], database: string): ClusterRequestExecutor {
    return <ClusterRequestExecutor>super.create(urls, database);
  }

  public static createForSingleNode(url: string, database: string): ClusterRequestExecutor {
    return <ClusterRequestExecutor>super.createForSingleNode(url, database);
  }

  protected getUpdateTopologyCommandClass(): new() => RavenCommand {
    return GetClusterTopologyCommand;
  }
}