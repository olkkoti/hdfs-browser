export interface HdfsFileStatus {
  pathSuffix: string;
  type: "FILE" | "DIRECTORY";
  length: number;
  owner: string;
  group: string;
  permission: string;
  accessTime: number;
  modificationTime: number;
  blockSize: number;
  replication: number;
}

export interface HdfsListResponse {
  FileStatuses: {
    FileStatus: HdfsFileStatus[];
  };
}

export interface HdfsStatusResponse {
  FileStatus: HdfsFileStatus;
}

export interface HdfsAclStatus {
  entries: string[];
  group: string;
  owner: string;
  permission: string;
  stickyBit: boolean;
}

export interface HdfsAclStatusResponse {
  AclStatus: HdfsAclStatus;
}

export interface ParsedAclEntry {
  scope: "access" | "default";
  type: "user" | "group" | "mask" | "other";
  name: string;
  permission: string;
}
