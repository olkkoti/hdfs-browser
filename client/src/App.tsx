import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listDirectory, mkdir, deleteFile as apiDeleteFile } from "./api/hdfs";
import { useAuth } from "./auth/AuthContext";
import BreadcrumbNav from "./components/BreadcrumbNav";
import FileTable from "./components/FileTable";
import Toolbar from "./components/Toolbar";
import FileViewer from "./components/FileViewer";
import UploadDialog from "./components/UploadDialog";
import PermissionsDialog from "./components/PermissionsDialog";
import LoginPage from "./components/LoginPage";

function FileBrowser() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const hdfsPath = "/" + (location.pathname.replace(/^\/browse\/?/, "").replace(/\/+$/, ""));

  const [showUpload, setShowUpload] = useState(false);
  const [permissionsTarget, setPermissionsTarget] = useState<{ path: string; isDirectory: boolean } | null>(null);

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
        <div className="app-header-user">
          <span>Signed in as {user}</span>
          <button className="app-header-logout" onClick={logout}>Sign out</button>
        </div>
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
            onDelete={handleDelete}
            onPermissions={(path, isDirectory) => setPermissionsTarget({ path, isDirectory })}
          />
        )}
      </main>
      {showUpload && (
        <UploadDialog
          currentPath={hdfsPath}
          onClose={() => setShowUpload(false)}
          onUploaded={handleRefresh}
        />
      )}
      {permissionsTarget && (
        <PermissionsDialog
          path={permissionsTarget.path}
          isDirectory={permissionsTarget.isDirectory}
          onClose={() => setPermissionsTarget(null)}
          onChanged={handleRefresh}
        />
      )}
    </div>
  );
}

function AppContent() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return <div className="status-message">Loading...</div>;
  }

  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <Routes>
      <Route path="/browse/*" element={<FileBrowser />} />
      <Route path="/view/*" element={<FileViewer />} />
      <Route path="*" element={<FileBrowser />} />
    </Routes>
  );
}

export default function App() {
  return <AppContent />;
}
