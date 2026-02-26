import { useRef, useState } from "react";
import { uploadFile } from "../api/hdfs";
import { useDialogAccessibility } from "../hooks/useDialogAccessibility";
import "./UploadDialog.css";

interface UploadDialogProps {
  currentPath: string;
  onClose: () => void;
  onUploaded: () => void;
}

export default function UploadDialog({ currentPath, onClose, onUploaded }: UploadDialogProps) {
  const dialogRef = useDialogAccessibility(onClose);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] || null);
    setError(null);
  }

  async function handleUpload() {
    if (!selectedFile) return;
    setUploading(true);
    setError(null);
    try {
      await uploadFile(currentPath, selectedFile);
      onUploaded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="upload-overlay" onClick={onClose}>
      <div className="upload-modal" ref={dialogRef} role="dialog" aria-modal="true" aria-label="Upload File" tabIndex={-1} onClick={(e) => e.stopPropagation()}>
        <div className="upload-header">
          <span className="upload-title">Upload File</span>
          <button className="upload-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="upload-body">
          <p className="upload-path">
            Destination: <code>{currentPath}</code>
          </p>
          <input ref={fileRef} type="file" onChange={handleFileChange} />
          {error && <p className="upload-error">{error}</p>}
        </div>
        <div className="upload-footer">
          <button className="upload-btn cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            className="upload-btn primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
