import {RequestExecutor} from "./RequestExecutor";
import {ServerNode} from "../ServerNode";
import {Topology} from "../Topology";
import {IRavenObject} from "../../Database/IRavenObject";
import {InvalidOperationException} from "../../Database/DatabaseExceptions";
import {IRavenResponse} from "../../Database/RavenCommandResponse";

export class NodeSelector {
  protected initialDatabase: string;
  protected topology: Topology;
  protected currentNodeIndex: number = 0;

  public get nodes(): ServerNode[] {
    if (!this.topology || !this.topology.nodes || !this.topology.nodes.length) {
      throw new InvalidOperationException("Empty database topology, this shouldn't happen.");
    }

    return this.topology.nodes;
  }

  public get topologyEtag(): number {
    return this.topology.etag;
  }

  public get currentNode(): ServerNode {
    return this.nodes[this.currentNodeIndex];
  }

  constructor(requestExecutor: RequestExecutor, urlsOrNodes: Array<string | ServerNode>, database: string, apiKey?: string) {
    const {TOPOLOGY_UPDATED, REQUEST_FAILED, NODE_STATUS_UPDATED} = RequestExecutor;
    const initialNodes: ServerNode[] = urlsOrNodes.map(
      (urlOrNode: string | ServerNode): ServerNode => (urlOrNode instanceof ServerNode)
        ? <ServerNode>urlOrNode : this.jsonToServerNode({Url: <string>urlOrNode, ApiKey: apiKey || null})
      );

    this.initialDatabase = database;
    this.topology = new Topology(Number.MIN_SAFE_INTEGER, initialNodes);    

    requestExecutor.on<IRavenResponse>(TOPOLOGY_UPDATED, 
      (data: IRavenResponse): void => this.onTopologyUpdated(data)
    );

    requestExecutor.on<ServerNode>(REQUEST_FAILED, 
      (data: ServerNode): void => this.onRequestFailed(data)
    );

    requestExecutor.on<ServerNode>(NODE_STATUS_UPDATED, 
      (data: ServerNode): void => this.onNodeRestored(data)
    );
  }

  protected onTopologyUpdated(topologyResponse: IRavenResponse): void {
    if (topologyResponse) {
      const newTopology: Topology = this.jsonToTopology(topologyResponse);

      if (this.topology.etag < newTopology.etag) {
        this.currentNodeIndex = 0;
        this.topology = newTopology;
      }
    }
  }

  protected onRequestFailed(failedNode: ServerNode): void {
    failedNode.isFailed = true;
    this.currentNodeIndex = ++this.currentNodeIndex % this.topology.nodes.length;
  }

  protected onNodeRestored(failedNode: ServerNode): void {
    const nodes: ServerNode[] = this.topology.nodes;

    if (nodes.includes(failedNode)) {
      const failedNodeIndex: number = nodes.indexOf(failedNode);
      
      if (this.currentNodeIndex > failedNodeIndex) {
        this.currentNodeIndex = failedNodeIndex;
      }
    }
  }

  protected jsonToTopology(response: IRavenResponse): Topology {
    return new Topology(
      parseInt(response.Etag as string) || 0,
      response.Nodes.map((jsonNode) => this.jsonToServerNode(jsonNode)),
      ('SLA' in response) ? parseFloat(response.SLA.RequestTimeThresholdInMilliseconds) / 1000 : 0
    );
  }

  protected jsonToServerNode(json: IRavenObject): ServerNode {
    return new ServerNode(json.Url, json.Database || this.initialDatabase, json.ApiKey || null);
  }  
}