import { useState } from "react";
import type { HdfsFileStatus } from "../types/hdfs";
import FileRow from "./FileRow";
import "./FileTable.css";

type SortKey = "name" | "size" | "modified" | "owner" | "type";
type SortDir = "asc" | "desc";

interface FileTableProps {
  files: HdfsFileStatus[];
  currentPath: string;
  currentDirStatus?: HdfsFileStatus;
  parentDirStatus?: HdfsFileStatus;
  onNavigate: (path: string) => void;
  onDelete: (path: string, name: string) => void;
  onPermissions: (path: string, isDirectory: boolean) => void;
}

export default function FileTable({ files, currentPath, currentDirStatus, parentDirStatus, onNavigate, onDelete, onPermissions }: FileTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = [...files].sort((a, b) => {
    // Directories first
    if (a.type !== b.type) return a.type === "DIRECTORY" ? -1 : 1;

    let cmp = 0;
    switch (sortKey) {
      case "name":
        cmp = a.pathSuffix.localeCompare(b.pathSuffix);
        break;
      case "size":
        cmp = a.length - b.length;
        break;
      case "modified":
        cmp = a.modificationTime - b.modificationTime;
        break;
      case "owner":
        cmp = a.owner.localeCompare(b.owner);
        break;
      case "type":
        cmp = a.type.localeCompare(b.type);
        break;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const dotEntry: HdfsFileStatus = currentDirStatus
    ? { ...currentDirStatus, pathSuffix: "." }
    : {
        pathSuffix: ".",
        type: "DIRECTORY",
        length: 0,
        owner: "",
        group: "",
        permission: "",
        accessTime: 0,
        modificationTime: 0,
        blockSize: 0,
        replication: 0,
      };

  const dotDotEntry: HdfsFileStatus = parentDirStatus
    ? { ...parentDirStatus, pathSuffix: ".." }
    : {
        pathSuffix: "..",
        type: "DIRECTORY",
        length: 0,
        owner: "",
        group: "",
        permission: "",
        accessTime: 0,
        modificationTime: 0,
        blockSize: 0,
        replication: 0,
      };

  const dotEntries = currentPath === "/" ? [dotEntry] : [dotEntry, dotDotEntry];

  const indicator = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : "";

  return (
    <div className="file-table-container">
      <table className="file-table">
        <thead>
          <tr>
            <th onClick={() => handleSort("type")} className="sortable" style={{ width: 40 }}>
              {indicator("type")}
            </th>
            <th onClick={() => handleSort("name")} className="sortable">
              Name{indicator("name")}
            </th>
            <th onClick={() => handleSort("size")} className="sortable" style={{ width: 100 }}>
              Size{indicator("size")}
            </th>
            <th onClick={() => handleSort("owner")} className="sortable" style={{ width: 120 }}>
              Owner{indicator("owner")}
            </th>
            <th style={{ width: 100 }}>Permissions</th>
            <th onClick={() => handleSort("modified")} className="sortable" style={{ width: 180 }}>
              Modified{indicator("modified")}
            </th>
            <th style={{ width: 100 }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {dotEntries.map((entry) => (
            <FileRow
              key={entry.pathSuffix}
              file={entry}
              currentPath={currentPath}
              onNavigate={onNavigate}
              onDelete={onDelete}
              onPermissions={onPermissions}
              isDotEntry
            />
          ))}
          {sorted.map((file) => (
            <FileRow
              key={file.pathSuffix}
              file={file}
              currentPath={currentPath}
              onNavigate={onNavigate}
              onDelete={onDelete}
              onPermissions={onPermissions}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
