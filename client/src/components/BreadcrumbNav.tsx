import "./BreadcrumbNav.css";

interface BreadcrumbNavProps {
  path: string;
  onNavigate: (path: string) => void;
}

export default function BreadcrumbNav({ path, onNavigate }: BreadcrumbNavProps) {
  const segments = path.split("/").filter(Boolean);

  return (
    <nav className="breadcrumb-nav">
      <button className="breadcrumb-link" onClick={() => onNavigate("/")}>
        /
      </button>
      {segments.map((seg, i) => {
        const segPath = "/" + segments.slice(0, i + 1).join("/");
        return (
          <span key={segPath}>
            {i > 0 && <span className="breadcrumb-separator">/</span>}
            <button className="breadcrumb-link" onClick={() => onNavigate(segPath)}>
              {seg}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
