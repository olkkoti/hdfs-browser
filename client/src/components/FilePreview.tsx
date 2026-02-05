import { useEffect, useState } from "react";
import { fetchTextContent } from "../api/hdfs";
import "./FilePreview.css";

interface FilePreviewProps {
  path: string;
  onClose: () => void;
}

export default function FilePreview({ path, onClose }: FilePreviewProps) {
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchTextContent(path)
      .then((text) => setContent(text))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load file"))
      .finally(() => setLoading(false));
  }, [path]);

  const filename = path.split("/").pop() || path;

  return (
    <div className="preview-overlay" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-header">
          <span className="preview-title">{filename}</span>
          <button className="preview-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="preview-body">
          {loading && <div className="preview-loading">Loading...</div>}
          {error && <div className="preview-error">{error}</div>}
          {content !== null && <pre className="preview-content">{content}</pre>}
        </div>
      </div>
    </div>
  );
}
