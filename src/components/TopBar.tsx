import { useMemo, useRef, useState } from "react";
import { useStore } from "../state/store";
import { AppStateData } from "../models/types";

interface TopBarProps {
  onToggleStats: () => void;
  showStats: boolean;
}

type NamedSave = {
  name: string;
  savedAt: number;
  state: AppStateData;
};

const NAMED_SAVE_KEY = "spaghetti-factory-named-saves";

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
  const selection = useStore((state) => state.selection);
  const duplicateNodes = useStore((state) => state.duplicateNodes);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [namedSaves, setNamedSaves] = useState<NamedSave[]>(() => {
    try {
      const stored = localStorage.getItem(NAMED_SAVE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored) as NamedSave[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [selectedSave, setSelectedSave] = useState("");
  const stateData = useStore((state) => ({
    nodes: state.nodes,
    flows: state.flows,
    floor: state.floor,
    grid: state.grid,
    lastModified: state.lastModified,
  }));
  const namedSaveOptions = useMemo(
    () => namedSaves.map((save) => ({ value: save.name, label: save.name })),
    [namedSaves]
  );

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

  const persistNamedSaves = (next: NamedSave[]) => {
    localStorage.setItem(NAMED_SAVE_KEY, JSON.stringify(next));
    setNamedSaves(next);
  };

  const handleNamedSave = () => {
    const name = window.prompt("Name this layout save:");
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const entry: NamedSave = {
      name: trimmed,
      savedAt: Date.now(),
      state: stateData,
    };
    const next = [entry, ...namedSaves.filter((save) => save.name !== trimmed)];
    persistNamedSaves(next);
    setSelectedSave(trimmed);
  };

  const handleLoadNamedSave = () => {
    const entry = namedSaves.find((save) => save.name === selectedSave);
    if (!entry) return;
    importState(entry.state);
  };

  const handleReset = () => {
    const confirmed = window.confirm(
      "Reset the layout? This clears your current work and cannot be undone."
    );
    if (confirmed) {
      resetAll();
    }
  };

  const canDuplicate = selection.type === "node" && selection.ids.length > 0;

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
        <button onClick={handleNamedSave}>Save As</button>
        <select
          aria-label="Saved layouts"
          value={selectedSave}
          onChange={(event) => setSelectedSave(event.target.value)}
        >
          <option value="">Saved layouts</option>
          {namedSaveOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button onClick={handleLoadNamedSave} disabled={!selectedSave}>
          Load
        </button>
        <button onClick={() => fileInputRef.current?.click()}>Import</button>
        <button onClick={handleExport}>Export</button>
        <button onClick={loadSample}>Load sample</button>
        <button onClick={handleReset}>Reset</button>
        <button onClick={() => duplicateNodes(selection.ids)} disabled={!canDuplicate}>
          Duplicate
        </button>
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
