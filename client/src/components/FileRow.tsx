import { useNavigate } from "react-router-dom";
import type { HdfsFileStatus } from "../types/hdfs";
import { downloadFile } from "../api/hdfs";
import "./FileRow.css";

interface FileRowProps {
  file: HdfsFileStatus;
  currentPath: string;
  onNavigate: (path: string) => void;
  onDelete: (path: string, name: string) => void;
  onPermissions: (path: string, isDirectory: boolean) => void;
  isDotEntry?: boolean;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0) + " " + units[i];
}

function formatDate(ts: number): string {
  if (ts === 0) return "-";
  return new Date(ts).toLocaleString();
}

function formatPermission(perm: string): string {
  return perm.padStart(3, "0");
}

export default function FileRow({ file, currentPath, onNavigate, onDelete, onPermissions, isDotEntry }: FileRowProps) {
  const routerNavigate = useNavigate();
  const isDir = file.type === "DIRECTORY";
  const fullPath = currentPath === "/" ? `/${file.pathSuffix}` : `${currentPath}/${file.pathSuffix}`;
  const icon = isDir ? "📁" : "📄";

  function handleClick() {
    if (isDotEntry) {
      if (file.pathSuffix === "..") {
        const parent = currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
        onNavigate(parent);
      } else {
        onNavigate(currentPath);
      }
      return;
    }
    if (isDir) {
      onNavigate(fullPath);
    } else {
      routerNavigate("/view" + fullPath);
    }
  }

  function handleDownload(e: React.MouseEvent) {
    e.stopPropagation();
    downloadFile(fullPath);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    onDelete(fullPath, file.pathSuffix);
  }

  function handlePermissions(e: React.MouseEvent) {
    e.stopPropagation();
    if (isDotEntry) {
      if (file.pathSuffix === "..") {
        const parent = currentPath.substring(0, currentPath.lastIndexOf("/")) || "/";
        onPermissions(parent, true);
      } else {
        onPermissions(currentPath, true);
      }
      return;
    }
    onPermissions(fullPath, isDir);
  }

  return (
    <tr className="file-row" onClick={handleClick}>
      <td>{icon}</td>
      <td className={isDotEntry || isDir ? "file-name dir-name" : "file-name file-link"}>{file.pathSuffix}</td>
      <td>{isDotEntry ? "" : isDir ? "-" : formatSize(file.length)}</td>
      <td>{isDotEntry && !file.owner ? "" : file.owner}</td>
      <td className="permission">{isDotEntry && !file.permission ? "" : formatPermission(file.permission)}</td>
      <td>{isDotEntry && !file.modificationTime ? "" : formatDate(file.modificationTime)}</td>
      <td className="actions">
        {!isDotEntry && !isDir && (
          <button className="action-btn" onClick={handleDownload} title="Download">
            ⬇
          </button>
        )}
        <button className="action-btn" onClick={handlePermissions} title="Permissions">
          🔒
        </button>
        {!isDotEntry && (
          <button className="action-btn delete-btn" onClick={handleDelete} title="Delete">
            ✕
          </button>
        )}
      </td>
    </tr>
  );
}
