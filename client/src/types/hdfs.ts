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
