import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listDirectory, mkdir, deleteFile as apiDeleteFile } from "./api/hdfs";
import BreadcrumbNav from "./components/BreadcrumbNav";
import FileTable from "./components/FileTable";
import Toolbar from "./components/Toolbar";
import FilePreview from "./components/FilePreview";
import UploadDialog from "./components/UploadDialog";

function FileBrowser() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const hdfsPath = "/" + (location.pathname.replace(/^\/browse\/?/, "").replace(/\/+$/, ""));

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["listDir", hdfsPath],
    queryFn: () => listDirectory(hdfsPath),
  });

  function handleNavigate(path: string) {
    const routePath = "/browse" + (path === "/" ? "" : path);
    navigate(routePath);
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["listDir", hdfsPath] });
  }

  async function handleNewFolder() {
    const name = window.prompt("Enter folder name:");
    if (!name) return;
    const newPath = hdfsPath === "/" ? `/${name}` : `${hdfsPath}/${name}`;
    try {
      await mkdir(newPath);
      handleRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create folder");
    }
  }

  async function handleDelete(path: string, name: string) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    try {
      await apiDeleteFile(path);
      handleRefresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const files = data?.FileStatuses?.FileStatus || [];

  return (
    <div className="app">
      <header className="app-header">
        <h1>HDFS Browser</h1>
      </header>
      <BreadcrumbNav path={hdfsPath} onNavigate={handleNavigate} />
      <Toolbar
        onUpload={() => setShowUpload(true)}
        onNewFolder={handleNewFolder}
        onRefresh={handleRefresh}
      />
      <main className="app-main">
        {isLoading && <div className="status-message">Loading...</div>}
        {error && (
          <div className="status-message error">
            {error instanceof Error ? error.message : "Failed to load directory"}
          </div>
        )}
        {!isLoading && !error && (
          <FileTable
            files={files}
            currentPath={hdfsPath}
            onNavigate={handleNavigate}
            onPreview={setPreviewPath}
            onDelete={handleDelete}
          />
        )}
      </main>
      {previewPath && (
        <FilePreview path={previewPath} onClose={() => setPreviewPath(null)} />
      )}
      {showUpload && (
        <UploadDialog
          currentPath={hdfsPath}
          onClose={() => setShowUpload(false)}
          onUploaded={handleRefresh}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/browse/*" element={<FileBrowser />} />
      <Route path="*" element={<FileBrowser />} />
    </Routes>
  );
}
