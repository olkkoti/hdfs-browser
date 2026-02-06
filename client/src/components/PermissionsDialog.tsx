import { useState, useEffect, useCallback } from "react";
import type { ParsedAclEntry, HdfsAclStatus } from "../types/hdfs";
import {
  getAclStatus,
  setPermission,
  setAcl,
  modifyAclEntries,
  removeAclEntries,
  removeAcl,
  removeDefaultAcl,
} from "../api/hdfs";
import {
  parseAclEntry,
  serializeAclEntry,
  serializeAclEntryForRemoval,
  octalToRwx,
  rwxToOctal,
  octalToRwxString,
  isBaseEntry,
} from "../utils/acl";
import "./PermissionsDialog.css";

interface PermissionsDialogProps {
  path: string;
  isDirectory: boolean;
  onClose: () => void;
  onChanged: () => void;
}

type Tab = "permissions" | "acls";

export default function PermissionsDialog({ path, isDirectory, onClose, onChanged }: PermissionsDialogProps) {
  const [tab, setTab] = useState<Tab>("permissions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aclStatus, setAclStatus] = useState<HdfsAclStatus | null>(null);

  // Permissions tab state
  const [octalInput, setOctalInput] = useState("755");
  const [saving, setSaving] = useState(false);

  // ACL tab state
  const [entries, setEntries] = useState<ParsedAclEntry[]>([]);
  const [newType, setNewType] = useState<"user" | "group">("user");
  const [newName, setNewName] = useState("");
  const [newR, setNewR] = useState(true);
  const [newW, setNewW] = useState(false);
  const [newX, setNewX] = useState(false);
  const [newScope, setNewScope] = useState<"access" | "default">("access");
  const [rawExpanded, setRawExpanded] = useState(false);
  const [rawSpec, setRawSpec] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAclStatus(path);
      const status = data.AclStatus;
      setAclStatus(status);
      setOctalInput(status.permission.padStart(3, "0"));
      const parsed = status.entries.map(parseAclEntry);
      setEntries(parsed);
      setRawSpec(status.entries.join(","));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Permissions tab handlers
  const rwx = octalToRwx(octalInput);
  const labels = ["Owner", "Group", "Other"] as const;

  function handleCheckboxChange(row: number, col: number, checked: boolean) {
    const newRwx = rwx.map((r) => [...r] as [boolean, boolean, boolean]);
    newRwx[row][col] = checked;
    setOctalInput(rwxToOctal(newRwx));
  }

  async function handleApplyPermission() {
    setSaving(true);
    setError(null);
    try {
      await setPermission(path, octalInput);
      onChanged();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set permission");
    } finally {
      setSaving(false);
    }
  }

  // ACL tab handlers
  async function handleAddEntry() {
    if (!newName.trim() && (newType === "user" || newType === "group")) {
      setError("Name is required for named user/group entries");
      return;
    }
    const perm = (newR ? "r" : "-") + (newW ? "w" : "-") + (newX ? "x" : "-");
    const entry: ParsedAclEntry = {
      scope: newScope,
      type: newType,
      name: newName.trim(),
      permission: perm,
    };
    setSaving(true);
    setError(null);
    try {
      await modifyAclEntries(path, serializeAclEntry(entry));
      setNewName("");
      setNewR(true);
      setNewW(false);
      setNewX(false);
      onChanged();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add ACL entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveEntry(entry: ParsedAclEntry) {
    setSaving(true);
    setError(null);
    try {
      await removeAclEntries(path, serializeAclEntryForRemoval(entry));
      onChanged();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove ACL entry");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveAllAcls() {
    if (!window.confirm("Remove all ACL entries? This will revert to basic POSIX permissions.")) return;
    setSaving(true);
    setError(null);
    try {
      await removeAcl(path);
      onChanged();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove ACLs");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveDefaultAcls() {
    if (!window.confirm("Remove all default ACL entries?")) return;
    setSaving(true);
    setError(null);
    try {
      await removeDefaultAcl(path);
      onChanged();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove default ACLs");
    } finally {
      setSaving(false);
    }
  }

  async function handleApplyRawSpec() {
    if (!rawSpec.trim()) {
      setError("ACL spec cannot be empty");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await setAcl(path, rawSpec.trim());
      onChanged();
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set ACL");
    } finally {
      setSaving(false);
    }
  }

  const accessEntries = entries.filter((e) => e.scope === "access");
  const defaultEntries = entries.filter((e) => e.scope === "default");

  function renderAclTable(items: ParsedAclEntry[], scope: "access" | "default") {
    return (
      <table className="acl-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Read</th>
            <th>Write</th>
            <th>Exec</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry, i) => (
            <tr key={`${entry.type}-${entry.name}-${i}`}>
              <td>{entry.type}</td>
              <td>{entry.name || <span className="acl-base-label">(base)</span>}</td>
              <td>{entry.permission.includes("r") ? "r" : "-"}</td>
              <td>{entry.permission.includes("w") ? "w" : "-"}</td>
              <td>{entry.permission.includes("x") ? "x" : "-"}</td>
              <td>
                {isBaseEntry(entry) ? (
                  <span className="acl-base-label">base</span>
                ) : (
                  <button
                    className="acl-remove-btn"
                    onClick={() => handleRemoveEntry(entry)}
                    disabled={saving}
                    title="Remove entry"
                  >
                    ✕
                  </button>
                )}
              </td>
            </tr>
          ))}
          <tr className="acl-add-row">
            <td>
              <select
                value={scope === "default" ? `default-${newType}` : newType}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith("default-")) {
                    setNewScope("default");
                    setNewType(val.replace("default-", "") as "user" | "group");
                  } else {
                    setNewScope(scope);
                    setNewType(val as "user" | "group");
                  }
                }}
              >
                <option value={scope === "default" ? "default-user" : "user"}>user</option>
                <option value={scope === "default" ? "default-group" : "group"}>group</option>
              </select>
            </td>
            <td>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="name"
              />
            </td>
            <td><input type="checkbox" checked={newR} onChange={(e) => setNewR(e.target.checked)} /></td>
            <td><input type="checkbox" checked={newW} onChange={(e) => setNewW(e.target.checked)} /></td>
            <td><input type="checkbox" checked={newX} onChange={(e) => setNewX(e.target.checked)} /></td>
            <td>
              <button className="acl-add-btn" onClick={handleAddEntry} disabled={saving}>
                + Add
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div className="perm-overlay" onClick={onClose}>
      <div className="perm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="perm-header">
          <span className="perm-title">Permissions: {path}</span>
          <button className="perm-close" onClick={onClose}>✕</button>
        </div>

        <div className="perm-tabs">
          <button
            className={`perm-tab ${tab === "permissions" ? "active" : ""}`}
            onClick={() => setTab("permissions")}
          >
            Permissions
          </button>
          <button
            className={`perm-tab ${tab === "acls" ? "active" : ""}`}
            onClick={() => setTab("acls")}
          >
            ACLs
          </button>
        </div>

        <div className="perm-body">
          {loading && <div className="perm-loading">Loading...</div>}
          {error && <div className="perm-error">{error}</div>}

          {!loading && tab === "permissions" && (
            <>
              {aclStatus && (
                <p className="perm-owner-info">
                  Owner: <strong>{aclStatus.owner}</strong> &nbsp; Group: <strong>{aclStatus.group}</strong>
                </p>
              )}

              <div className="perm-octal-row">
                <label>Octal:</label>
                <input
                  className="perm-octal-input"
                  type="text"
                  value={octalInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-7]/g, "").slice(0, 4);
                    setOctalInput(val);
                  }}
                  maxLength={4}
                />
                <span className="perm-preview">
                  {octalToRwxString(octalInput)}
                </span>
              </div>

              <div className="perm-checkbox-grid">
                <table>
                  <thead>
                    <tr>
                      <th></th>
                      <th>Read</th>
                      <th>Write</th>
                      <th>Execute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map((label, row) => (
                      <tr key={label}>
                        <td>{label}</td>
                        {[0, 1, 2].map((col) => (
                          <td key={col}>
                            <input
                              type="checkbox"
                              checked={rwx[row]?.[col] ?? false}
                              onChange={(e) => handleCheckboxChange(row, col, e.target.checked)}
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!loading && tab === "acls" && (
            <>
              {aclStatus && (
                <p className="perm-owner-info">
                  Owner: <strong>{aclStatus.owner}</strong> &nbsp; Group: <strong>{aclStatus.group}</strong>
                </p>
              )}

              <div className="acl-section">
                <h4>Access ACL Entries</h4>
                {renderAclTable(accessEntries, "access")}
              </div>

              {isDirectory && (
                <div className="acl-section">
                  <h4>Default ACL Entries</h4>
                  {defaultEntries.length === 0 ? (
                    <p style={{ fontSize: 13, color: "#999", margin: "0 0 8px" }}>No default ACL entries</p>
                  ) : null}
                  {renderAclTable(defaultEntries, "default")}
                </div>
              )}

              <div className="acl-actions-bar">
                <button className="perm-btn danger" onClick={handleRemoveAllAcls} disabled={saving}>
                  Remove All ACLs
                </button>
                {isDirectory && (
                  <button className="perm-btn danger" onClick={handleRemoveDefaultAcls} disabled={saving}>
                    Remove Default ACLs
                  </button>
                )}
              </div>

              <div className="acl-raw-section">
                <button className="acl-raw-toggle" onClick={() => setRawExpanded(!rawExpanded)}>
                  {rawExpanded ? "▾" : "▸"} Raw ACL Spec
                </button>
                {rawExpanded && (
                  <>
                    <textarea
                      className="acl-raw-textarea"
                      value={rawSpec}
                      onChange={(e) => setRawSpec(e.target.value)}
                    />
                    <button className="perm-btn primary" onClick={handleApplyRawSpec} disabled={saving}>
                      Apply Raw Spec
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {tab === "permissions" && !loading && (
          <div className="perm-footer">
            <button className="perm-btn cancel" onClick={onClose}>Cancel</button>
            <button
              className="perm-btn primary"
              onClick={handleApplyPermission}
              disabled={saving || !octalInput}
            >
              {saving ? "Applying..." : "Apply"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
