import { useMemo, useState } from "react";
import { CanvasStage } from "./components/CanvasStage";
import { LeftPalette } from "./components/LeftPalette";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { StatsPanel } from "./components/StatsPanel";
import { TopBar } from "./components/TopBar";
import { useStore } from "./state/store";

const App = () => {
  const selection = useStore((state) => state.selection);
  const [showStats, setShowStats] = useState(true);

  const selectionLabel = useMemo(() => {
    if (selection.type === "node") return `${selection.ids.length} node selected`;
    if (selection.type === "flow") return `${selection.ids.length} flow selected`;
    return "No selection";
  }, [selection]);

  return (
    <div className="app">
      <TopBar onToggleStats={() => setShowStats((prev) => !prev)} showStats={showStats} />
      <div className="content">
        <LeftPalette />
        <div className="center">
          <div className="canvas-container">
            <CanvasStage />
          </div>
          <div className="selection-banner">{selectionLabel}</div>
        </div>
        <div className="right-panel">
          <PropertiesPanel />
          {showStats && <StatsPanel />}
        </div>
      </div>
    </div>
  );
};

export default App;
