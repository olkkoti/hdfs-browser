import type { HdfsListResponse, HdfsStatusResponse } from "../types.js";

const NAMENODE_HOST = process.env.HDFS_NAMENODE_HOST || "localhost";
const NAMENODE_PORT = process.env.HDFS_NAMENODE_PORT || "9870";
const HDFS_USER = process.env.HDFS_USER || "hdfs";

function webhdfsUrl(path: string, op: string, extra?: Record<string, string>): string {
  const params = new URLSearchParams({ op, "user.name": HDFS_USER, ...extra });
  return `http://${NAMENODE_HOST}:${NAMENODE_PORT}/webhdfs/v1${path}?${params}`;
}

export async function listDirectory(path: string): Promise<HdfsListResponse> {
  const res = await fetch(webhdfsUrl(path, "LISTSTATUS"));
  if (!res.ok) {
    throw new Error(`HDFS LISTSTATUS failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<HdfsListResponse>;
}

export async function getFileStatus(path: string): Promise<HdfsStatusResponse> {
  const res = await fetch(webhdfsUrl(path, "GETFILESTATUS"));
  if (!res.ok) {
    throw new Error(`HDFS GETFILESTATUS failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<HdfsStatusResponse>;
}

export async function downloadFile(path: string): Promise<Response> {
  const res = await fetch(webhdfsUrl(path, "OPEN"), { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`HDFS OPEN failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

export async function uploadFile(path: string, data: Uint8Array, filename: string): Promise<void> {
  // Step 1: Create request (returns redirect URL)
  const createRes = await fetch(webhdfsUrl(path + "/" + filename, "CREATE", { overwrite: "true" }), {
    method: "PUT",
    redirect: "manual",
  });

  const location = createRes.headers.get("location");
  if (!location) {
    throw new Error(`HDFS CREATE did not return redirect location: ${createRes.status}`);
  }

  // Step 2: Send data to datanode
  const uploadRes = await fetch(location, {
    method: "PUT",
    body: data as unknown as BodyInit,
    headers: { "Content-Type": "application/octet-stream" },
  });

  if (!uploadRes.ok && uploadRes.status !== 201) {
    throw new Error(`HDFS upload failed: ${uploadRes.status} ${await uploadRes.text()}`);
  }
}

export async function mkdirs(path: string): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "MKDIRS"), { method: "PUT" });
  if (!res.ok) {
    throw new Error(`HDFS MKDIRS failed: ${res.status} ${await res.text()}`);
  }
}

export async function deleteFile(path: string, recursive = true): Promise<void> {
  const res = await fetch(webhdfsUrl(path, "DELETE", { recursive: String(recursive) }), {
    method: "DELETE",
  });
  if (!res.ok) {
    throw new Error(`HDFS DELETE failed: ${res.status} ${await res.text()}`);
  }
}

export async function rename(src: string, dest: string): Promise<void> {
  const res = await fetch(webhdfsUrl(src, "RENAME", { destination: dest }), {
    method: "PUT",
  });
  if (!res.ok) {
    throw new Error(`HDFS RENAME failed: ${res.status} ${await res.text()}`);
  }
}
