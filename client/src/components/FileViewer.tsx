import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getFileStatus, getAclStatus, fetchFileContent, downloadFile, deleteFile } from "../api/hdfs";
import { useAuth } from "../auth/AuthContext";
import { base64ToBytes, isBinaryContent } from "../utils/binary";
import { hexDump } from "../utils/hexdump";
import { parseAclEntry } from "../utils/acl";
import PermissionsDialog from "./PermissionsDialog";
import "./FileViewer.css";

const PAGE_SIZE = 65536;

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
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

export default function FileViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const hdfsPath = "/" + location.pathname.replace(/^\/view\/?/, "").replace(/\/+$/, "");
  const filename = hdfsPath.split("/").pop() || hdfsPath;
  const parentPath = hdfsPath.substring(0, hdfsPath.lastIndexOf("/")) || "/";

  const [offset, setOffset] = useState(0);
  const [isBinary, setIsBinary] = useState<boolean | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);

  const { data: statusData, isLoading: statusLoading, error: statusError } = useQuery({
    queryKey: ["fileStatus", hdfsPath],
    queryFn: () => getFileStatus(hdfsPath),
  });

  const { data: aclData } = useQuery({
    queryKey: ["aclStatus", hdfsPath],
    queryFn: () => getAclStatus(hdfsPath),
  });

  const { data: contentData, isLoading: contentLoading, error: contentError } = useQuery({
    queryKey: ["fileContent", hdfsPath, offset],
    queryFn: () => fetchFileContent(hdfsPath, offset, PAGE_SIZE),
  });

  useEffect(() => {
    if (isBinary === null && contentData && contentData.data.length > 0) {
      const bytes = base64ToBytes(contentData.data);
      setIsBinary(isBinaryContent(bytes));
    }
  }, [contentData, isBinary]);

  const [jumpInput, setJumpInput] = useState("");

  const fileStatus = statusData?.FileStatus;
  const totalSize = fileStatus?.length ?? 0;

  function handlePrev() {
    setOffset(Math.max(0, offset - PAGE_SIZE));
  }

  function handleNext() {
    if (contentData?.hasMore) {
      setOffset(offset + PAGE_SIZE);
    }
  }

  function handleJump() {
    const target = parseInt(jumpInput, 10);
    if (isNaN(target) || target < 0) return;
    const clamped = Math.min(target, Math.max(0, totalSize - 1));
    setOffset(clamped);
    setJumpInput("");
  }

  function handleBack() {
    navigate("/browse" + (parentPath === "/" ? "" : parentPath));
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${filename}"?`)) return;
    try {
      await deleteFile(hdfsPath);
      handleBack();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  function renderContent() {
    if (contentLoading) return <div className="fv-loading">Loading...</div>;
    if (contentError) return <div className="fv-error">{contentError instanceof Error ? contentError.message : "Failed to load content"}</div>;
    if (!contentData) return null;

    const bytes = base64ToBytes(contentData.data);

    if (isBinary) {
      const lines = hexDump(bytes, contentData.offset);
      return (
        <div className="fv-hex-content">
          {lines.map((line, i) => (
            <div key={i} className="fv-hex-line">
              <span className="fv-hex-offset">{line.offset}</span>
              {"  "}
              <span className="fv-hex-bytes">{line.hex}</span>
              {"  |"}
              <span className="fv-hex-ascii">{line.ascii}</span>
              {"|"}
            </div>
          ))}
        </div>
      );
    }

    const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const lines = text.split("\n");
    // Remove trailing empty line from split
    if (lines.length > 1 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    return (
      <div className="fv-text-content">
        {lines.map((line, i) => (
          <div key={i} className="fv-text-line">
            <span className="fv-line-number">{i + 1}</span>
            <span className="fv-line-content">{line}</span>
          </div>
        ))}
      </div>
    );
  }

  const isLoading = statusLoading || contentLoading;
  const error = statusError || contentError;

  return (
    <div className="fv-container">
      <header className="fv-header">
        <div className="fv-header-left">
          <button className="fv-back-btn" onClick={handleBack}>Back</button>
          <span className="fv-filename">{filename}</span>
          {isBinary !== null && (
            <span className="fv-mode-tag">{isBinary ? "Binary" : "Text"}</span>
          )}
        </div>
        <div className="fv-header-right">
          <span>Signed in as {user}</span>
          <button className="fv-header-logout" onClick={logout}>Sign out</button>
        </div>
      </header>

      <div className="fv-body">
        <aside className="fv-sidebar">
          <div className="fv-sidebar-section">
            <h3>Attributes</h3>
            {statusLoading && <div className="fv-loading">Loading...</div>}
            {statusError && <div className="fv-error">Failed to load metadata</div>}
            {fileStatus && (
              <table className="fv-attr-table">
                <tbody>
                  <tr><td>Name</td><td>{fileStatus.pathSuffix || filename}</td></tr>
                  <tr><td>Path</td><td>{hdfsPath}</td></tr>
                  <tr><td>Size</td><td>{formatSize(fileStatus.length)}</td></tr>
                  <tr><td>Owner</td><td>{fileStatus.owner}</td></tr>
                  <tr><td>Group</td><td>{fileStatus.group}</td></tr>
                  <tr><td>Permissions</td><td>{formatPermission(fileStatus.permission)}</td></tr>
                  <tr><td>Replication</td><td>{fileStatus.replication}</td></tr>
                  <tr><td>Block Size</td><td>{formatSize(fileStatus.blockSize)}</td></tr>
                  <tr><td>Modified</td><td>{formatDate(fileStatus.modificationTime)}</td></tr>
                  <tr><td>Accessed</td><td>{formatDate(fileStatus.accessTime)}</td></tr>
                </tbody>
              </table>
            )}
          </div>

          {aclData && (
            <div className="fv-sidebar-section">
              <h3>Access Control</h3>
              <table className="fv-acl-table">
                <thead>
                  <tr><th>Entry</th><th>Perm</th></tr>
                </thead>
                <tbody>
                  {aclData.AclStatus.entries.map((entry, i) => {
                    const parsed = parseAclEntry(entry);
                    const label = parsed.scope === "default" ? `default:${parsed.type}` : parsed.type;
                    const name = parsed.name || "(base)";
                    return (
                      <tr key={i}>
                        <td>{label}:{name}</td>
                        <td>{parsed.permission}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="fv-sidebar-section">
            <h3>Actions</h3>
            <div className="fv-sidebar-actions">
              <button className="fv-action-btn" onClick={() => downloadFile(hdfsPath)}>Download</button>
              <button className="fv-action-btn" onClick={() => setShowPermissions(true)}>Permissions</button>
              <button className="fv-action-btn danger" onClick={handleDelete}>Delete</button>
              <button className="fv-action-btn" onClick={handleBack}>Back to directory</button>
            </div>
          </div>
        </aside>

        <div className="fv-content">
          {!isLoading && !error && totalSize > 0 && (
            <div className="fv-pagination">
              <button className="fv-page-btn" onClick={handlePrev} disabled={offset === 0}>Prev</button>
              <span className="fv-byte-range">
                {offset.toLocaleString()}&ndash;{Math.min(offset + (contentData?.length ?? PAGE_SIZE), totalSize).toLocaleString()} of {totalSize.toLocaleString()} bytes
              </span>
              <button className="fv-page-btn" onClick={handleNext} disabled={!contentData?.hasMore}>Next</button>
              <input
                className="fv-jump-input"
                type="text"
                placeholder="Offset"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value.replace(/[^0-9]/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && handleJump()}
              />
              <button className="fv-page-btn" onClick={handleJump}>Go</button>
            </div>
          )}

          <div className="fv-content-body">
            {totalSize === 0 && !isLoading && !error && (
              <div className="fv-loading">File is empty</div>
            )}
            {renderContent()}
          </div>
        </div>
      </div>

      {showPermissions && (
        <PermissionsDialog
          path={hdfsPath}
          isDirectory={false}
          onClose={() => setShowPermissions(false)}
          onChanged={() => {}}
        />
      )}
    </div>
  );
}
