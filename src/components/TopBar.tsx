import { useRef } from "react";
import { useStore } from "../state/store";

interface TopBarProps {
  onToggleStats: () => void;
  showStats: boolean;
}

export const TopBar = ({ onToggleStats, showStats }: TopBarProps) => {
  const tool = useStore((state) => state.tool);
  const setTool = useStore((state) => state.setTool);
  const animate = useStore((state) => state.animate);
  const setAnimate = useStore((state) => state.setAnimate);
  const importState = useStore((state) => state.importState);
  const resetAll = useStore((state) => state.resetAll);
  const loadSample = useStore((state) => state.loadSample);
  const sync = useStore((state) => state.sync);
  const pullSync = useStore((state) => state.pullSync);
  const pushSync = useStore((state) => state.pushSync);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const stateData = useStore((state) => ({
    nodes: state.nodes,
    flows: state.flows,
    floor: state.floor,
    grid: state.grid,
    lastModified: state.lastModified,
  }));

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(stateData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spaghetti-layout.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    const data = JSON.parse(text);
    importState(data);
  };

  return (
    <div className="top-bar">
      <div className="tool-group">
        <button
          className={tool === "select" ? "active" : ""}
          onClick={() => setTool("select")}
        >
          Select
        </button>
        <button
          className={tool === "pan" ? "active" : ""}
          onClick={() => setTool("pan")}
        >
          Pan
        </button>
        <button
          className={tool === "add-flow-product" ? "active" : ""}
          onClick={() => setTool("add-flow-product")}
        >
          Add Product Flow
        </button>
        <button
          className={tool === "add-flow-person" ? "active" : ""}
          onClick={() => setTool("add-flow-person")}
        >
          Add Person Flow
        </button>
        <button className={animate ? "active" : ""} onClick={() => setAnimate(!animate)}>
          Animate
        </button>
      </div>
      <div className="tool-group">
        <button onClick={pullSync} disabled={!sync.endpoint || sync.status === "syncing"}>
          Sync Pull
        </button>
        <button onClick={pushSync} disabled={!sync.endpoint || sync.status === "syncing"}>
          Sync Push
        </button>
        <button onClick={() => fileInputRef.current?.click()}>Import</button>
        <button onClick={handleExport}>Export</button>
        <button onClick={loadSample}>Load sample</button>
        <button onClick={resetAll}>Reset</button>
        <button onClick={onToggleStats}>{showStats ? "Hide" : "Show"} Stats</button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: "none" }}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleImport(file);
            }
          }}
        />
      </div>
      <div className="sync-status">
        <div>Sync: {sync.status}</div>
        {sync.lastPull && <div>Last Pull: {new Date(sync.lastPull).toLocaleTimeString()}</div>}
        {sync.lastPush && <div>Last Push: {new Date(sync.lastPush).toLocaleTimeString()}</div>}
        {sync.warning && <div className="warning">{sync.warning}</div>}
        {sync.errorMessage && <div className="error">{sync.errorMessage}</div>}
      </div>
    </div>
  );
};
