import type { HdfsListResponse, HdfsStatusResponse } from "../types/hdfs";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
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

export async function fetchTextContent(path: string): Promise<string> {
  const res = await fetch(`/api/files/download?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`Failed to fetch file: ${res.status}`);
  return res.text();
}
