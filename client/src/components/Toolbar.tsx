import "./Toolbar.css";

interface ToolbarProps {
  onUpload: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
}

export default function Toolbar({ onUpload, onNewFolder, onRefresh }: ToolbarProps) {
  return (
    <div className="toolbar">
      <button className="toolbar-btn" onClick={onUpload}>
        Upload File
      </button>
      <button className="toolbar-btn" onClick={onNewFolder}>
        New Folder
      </button>
      <button className="toolbar-btn" onClick={onRefresh}>
        Refresh
      </button>
    </div>
  );
}
