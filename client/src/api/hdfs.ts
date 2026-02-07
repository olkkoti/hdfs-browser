import type { HdfsListResponse, HdfsStatusResponse, HdfsAclStatusResponse, FileContentResponse } from "../types/hdfs";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function listDirectory(path: string): Promise<HdfsListResponse> {
  return request(`/api/files/list?path=${encodeURIComponent(path)}`);
}

export function getFileStatus(path: string): Promise<HdfsStatusResponse> {
  return request(`/api/files/status?path=${encodeURIComponent(path)}`);
}

export function downloadFile(path: string): void {
  window.open(`/api/files/download?path=${encodeURIComponent(path)}`, "_blank");
}

export function uploadFile(path: string, file: File): Promise<{ success: boolean }> {
  const formData = new FormData();
  formData.append("file", file);
  return request(`/api/files/upload?path=${encodeURIComponent(path)}`, {
    method: "POST",
    body: formData,
  });
}

export function mkdir(path: string): Promise<{ success: boolean }> {
  return request(`/api/files/mkdir?path=${encodeURIComponent(path)}`, {
    method: "PUT",
  });
}

export function deleteFile(path: string): Promise<{ success: boolean }> {
  return request(`/api/files?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

export function rename(from: string, to: string): Promise<{ success: boolean }> {
  return request(
    `/api/files/rename?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    { method: "PUT" }
  );
}

export function getAclStatus(path: string): Promise<HdfsAclStatusResponse> {
  return request(`/api/files/acl?path=${encodeURIComponent(path)}`);
}

export function setPermission(path: string, permission: string): Promise<{ success: boolean }> {
  return request(
    `/api/files/permission?path=${encodeURIComponent(path)}&permission=${encodeURIComponent(permission)}`,
    { method: "PUT" }
  );
}

export function setAcl(path: string, aclspec: string): Promise<{ success: boolean }> {
  return request(
    `/api/files/acl?path=${encodeURIComponent(path)}&aclspec=${encodeURIComponent(aclspec)}`,
    { method: "PUT" }
  );
}

export function modifyAclEntries(path: string, aclspec: string): Promise<{ success: boolean }> {
  return request(
    `/api/files/acl/modify?path=${encodeURIComponent(path)}&aclspec=${encodeURIComponent(aclspec)}`,
    { method: "PUT" }
  );
}

export function removeAclEntries(path: string, aclspec: string): Promise<{ success: boolean }> {
  return request(
    `/api/files/acl/remove?path=${encodeURIComponent(path)}&aclspec=${encodeURIComponent(aclspec)}`,
    { method: "PUT" }
  );
}

export function removeAcl(path: string): Promise<{ success: boolean }> {
  return request(`/api/files/acl?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

export function removeDefaultAcl(path: string): Promise<{ success: boolean }> {
  return request(`/api/files/acl/default?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  });
}

export function fetchFileContent(path: string, offset = 0, length = 65536): Promise<FileContentResponse> {
  return request(`/api/files/content?path=${encodeURIComponent(path)}&offset=${offset}&length=${length}`);
}
