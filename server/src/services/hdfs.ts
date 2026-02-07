import http from "http";
import type { HdfsListResponse, HdfsStatusResponse, HdfsAclStatusResponse } from "../types.js";

const NAMENODE_HOST = process.env.HDFS_NAMENODE_HOST || "localhost";
const NAMENODE_PORT = process.env.HDFS_NAMENODE_PORT || "9870";
const DEFAULT_HDFS_USER = process.env.HDFS_USER || "hdfs";

function webhdfsUrl(path: string, op: string, user?: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ op, "user.name": user || DEFAULT_HDFS_USER, ...extra });
  return `http://${NAMENODE_HOST}:${NAMENODE_PORT}/webhdfs/v1${path}?${params}`;
}

export async function listDirectory(path: string, user?: string): Promise<HdfsListResponse> {
  const res = await fetch(webhdfsUrl(path, "LISTSTATUS", user));
  if (!res.ok) {
    throw new Error(`HDFS LISTSTATUS failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<HdfsListResponse>;
}

export async function getFileStatus(path: string, user?: string): Promise<HdfsStatusResponse> {
  const res = await fetch(webhdfsUrl(path, "GETFILESTATUS", user));
  if (!res.ok) {
    throw new Error(`HDFS GETFILESTATUS failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<HdfsStatusResponse>;
}

export async function downloadFile(path: string, user?: string): Promise<Response> {
  const res = await fetch(webhdfsUrl(path, "OPEN", user), { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HDFS OPEN failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

export async function readFileChunk(path: string, offset: number, length: number, user?: string): Promise<Buffer> {
  const res = await fetch(webhdfsUrl(path, "OPEN", user, { offset: String(offset), length: String(length) }), { redirect: "follow" });
  if (!res.ok) throw new Error(`HDFS OPEN failed: ${res.status} ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function uploadFile(path: string, data: Uint8Array, filename: string, user?: string): Promise<void> {
  // Step 1: Create request (returns redirect URL)
  const createRes = await fetch(webhdfsUrl(path + "/" + filename, "CREATE", user, { overwrite: "true" }), {
    method: "PUT",
    redirect: "manual",
  });

  // Consume the response body to free the connection
  await createRes.text();

  const location = createRes.headers.get("location");
  if (!location) {
    throw new Error(`HDFS CREATE did not return redirect location: ${createRes.status}`);
  }

  // Step 2: Send data to datanode using http.request
  // (Node.js native fetch/undici rejects the datanode's non-compliant HTTP response)
  const status = await new Promise<number>((resolve, reject) => {
    const parsed = new URL(location);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: "PUT",
      headers: { "Content-Type": "application/octet-stream", "Content-Length": data.length },
    }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", reject);
    req.end(data);
  });

  if (status !== 200 && status !== 201) {
    throw new Error(`HDFS upload failed: ${status}`);
  }
}

export async function mkdirs(path: string, user?: string): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "MKDIRS", user), { method: "PUT" });
  if (!res.ok) {
    throw new Error(`HDFS MKDIRS failed: ${res.status} ${await res.text()}`);
  }
}

export async function deleteFile(path: string, user?: string, recursive = true): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "DELETE", user, { recursive: String(recursive) }), {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`HDFS DELETE failed: ${res.status} ${await res.text()}`);
  }
}

export async function rename(src: string, dest: string, user?: string): Promise<void> {
  const res = await fetch(webhdfsUrl(src, "RENAME", user, { destination: dest }), {
    method: "PUT",
  });
  if (!res.ok) {
    throw new Error(`HDFS RENAME failed: ${res.status} ${await res.text()}`);
  }
}

export async function getAclStatus(path: string, user?: string): Promise<HdfsAclStatusResponse> {
  const res = await fetch(webhdfsUrl(path, "GETACLSTATUS", user));
  if (!res.ok) {
    throw new Error(`HDFS GETACLSTATUS failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<HdfsAclStatusResponse>;
}

export async function setPermission(path: string, permission: string, user?: string): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "SETPERMISSION", user, { permission }), {
    method: "PUT",
  });
  if (!res.ok) {
    throw new Error(`HDFS SETPERMISSION failed: ${res.status} ${await res.text()}`);
  }
}

export async function setAcl(path: string, aclspec: string, user?: string): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "SETACL", user, { aclspec }), {
    method: "PUT",
  });
  if (!res.ok) {
    throw new Error(`HDFS SETACL failed: ${res.status} ${await res.text()}`);
  }
}

export async function modifyAclEntries(path: string, aclspec: string, user?: string): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "MODIFYACLENTRIES", user, { aclspec }), {
    method: "PUT",
  });
  if (!res.ok) {
    throw new Error(`HDFS MODIFYACLENTRIES failed: ${res.status} ${await res.text()}`);
  }
}

export async function removeAclEntries(path: string, aclspec: string, user?: string): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "REMOVEACLENTRIES", user, { aclspec }), {
    method: "PUT",
  });
  if (!res.ok) {
    throw new Error(`HDFS REMOVEACLENTRIES failed: ${res.status} ${await res.text()}`);
  }
}

export async function removeAcl(path: string, user?: string): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "REMOVEACL", user), {
    method: "PUT",
  });
  if (!res.ok) {
    throw new Error(`HDFS REMOVEACL failed: ${res.status} ${await res.text()}`);
  }
}

export async function removeDefaultAcl(path: string, user?: string): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "REMOVEDEFAULTACL", user), {
    method: "PUT",
  });
  if (!res.ok) {
    throw new Error(`HDFS REMOVEDEFAULTACL failed: ${res.status} ${await res.text()}`);
  }
}
