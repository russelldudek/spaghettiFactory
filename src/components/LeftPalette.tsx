import { createNodeTemplate, useStore } from "../state/store";
import { NodeType } from "../models/types";

const paletteItems: { label: string; type: NodeType; props?: Record<string, unknown> }[] = [
  { label: "Workstation", type: "workstation" },
  { label: "Person", type: "person" },
  { label: "Shelf", type: "shelf" },
  { label: "Bench", type: "bench", props: { benchShape: "straight" } },
  { label: "L-Shaped Bench", type: "bench", props: { benchShape: "l" } },
  { label: "Dock", type: "dock" },
  { label: "Inbound Lane", type: "lane", props: { laneDirection: "inbound" } },
  { label: "Outbound Lane", type: "lane", props: { laneDirection: "outbound" } },
  { label: "Bay Door", type: "door", props: { doorKind: "bay" } },
  { label: "Man Door", type: "door", props: { doorKind: "man" } },
];

export const LeftPalette = () => {
  const addNode = useStore((state) => state.addNode);

  return (
    <div className="left-panel">
      <h3>Palette</h3>
      <div className="palette-list">
        {paletteItems.map((item) => (
          <button
            key={item.label}
            onClick={() => {
              const template = createNodeTemplate(item.type);
              addNode({
                ...template,
                name: item.label,
                props: { ...template.props, ...item.props },
              });
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
