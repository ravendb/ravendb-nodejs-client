import {RequestExecutor} from "./RequestExecutor";
import {RavenCommand} from "../../Database/RavenCommand";
import {GetClusterTopologyCommand} from "../../Database/Commands/GetClusterTopologyCommand";

export class ClusterRequestExecutor extends RequestExecutor {
  protected getUpdateTopologyCommandClass(): new() => RavenCommand {
    return GetClusterTopologyCommand;
  }
}