import { createHash } from "node:crypto";
import { DocumentConventions } from "../Documents/Conventions/DocumentConventions.js";
import { getLogger } from "../Utility/LogUtil.js";
import { Topology } from "./Topology.js";
import { ServerNode } from "./ServerNode.js";

const log = getLogger({ module: "TopologyLocalCache" });

export type TopologyCacheKind = "database" | "cluster";

export function getTopologyHash(initialUrls: string[]): string {
    return createHash("md5").update(initialUrls.join(",").toLowerCase()).digest("hex");
}

async function getPath(fileName: string, conventions: DocumentConventions): Promise<string> {
    const { join } = await import("node:path");
    return join(conventions.topologyCacheLocation ?? process.cwd(), fileName);
}

function getFileName(kind: TopologyCacheKind, topologyHash: string, databaseName: string): string {
    return kind === "database"
        ? `${databaseName}.${topologyHash}.raven-database-topology`
        : `${topologyHash}.raven-cluster-topology`;
}

async function readTopology(path: string): Promise<Topology> {
    const { readFile } = await import("node:fs/promises");
    const json = JSON.parse(await readFile(path, "utf8"));
    const toServerNode = (x: ServerNode) => new ServerNode(x);
    return new Topology(json.etag, json.nodes.map(toServerNode), json.promotables.map(toServerNode));
}

export async function tryLoadTopology(
    kind: TopologyCacheKind,
    topologyHash: string,
    databaseName: string,
    conventions: DocumentConventions): Promise<Topology | null> {
    if (conventions.disableTopologyCache) {
        return null;
    }

    try {
        return await readTopology(await getPath(getFileName(kind, topologyHash, databaseName), conventions));
    } catch (err) {
        if (err.code !== "ENOENT") {
            log.warn(err, `Could not understand the persisted ${kind} topology`);
        }

        return null;
    }
}

export async function trySaveTopology(
    kind: TopologyCacheKind,
    topologyHash: string,
    databaseName: string,
    topology: Topology,
    conventions: DocumentConventions): Promise<void> {
    if (conventions.disableTopologyCache) {
        return;
    }

    try {
        const existingTopology = await tryLoadTopology(kind, topologyHash, databaseName, conventions);
        if (existingTopology?.etag >= topology.etag) {
            return;
        }

        const toJson = (x: ServerNode) => ({
            url: x.url,
            database: x.database,
            clusterTag: x.clusterTag,
            serverRole: x.serverRole
        });

        const { writeFile } = await import("node:fs/promises");
        await writeFile(await getPath(getFileName(kind, topologyHash, databaseName), conventions), JSON.stringify({
            nodes: topology.nodes.map(toJson),
            promotables: topology.promotables.map(toJson),
            etag: topology.etag,
            persistedAt: new Date().toISOString()
        }));
    } catch (err) {
        log.warn(err, `Could not persist the ${kind} topology`);
    }
}
