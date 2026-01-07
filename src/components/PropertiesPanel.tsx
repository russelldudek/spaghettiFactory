import { ChangeEvent } from "react";
import { Flow, Node } from "../models/types";
import { useStore } from "../state/store";

const ListEditor = ({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[] | undefined;
  onChange: (values: string[]) => void;
}) => {
  return (
    <label className="field">
      {label}
      <textarea
        value={(values ?? []).join("\n")}
        onChange={(event) =>
          onChange(
            event.target.value
              .split("\n")
              .map((value) => value.trim())
              .filter(Boolean)
          )
        }
      />
    </label>
  );
};

const NodeEditor = ({ node }: { node: Node }) => {
  const updateNode = useStore((state) => state.updateNode);

  const handleNumber = (key: keyof Node) => (event: ChangeEvent<HTMLInputElement>) => {
    updateNode(node.id, { [key]: Number(event.target.value) } as Partial<Node>);
  };

  return (
    <div>
      <h3>Node Properties</h3>
      <label className="field">
        Name
        <input value={node.name} onChange={(event) => updateNode(node.id, { name: event.target.value })} />
      </label>
      <div className="grid-2">
        <label className="field">
          X (ft)
          <input type="number" value={node.x} onChange={handleNumber("x")} />
        </label>
        <label className="field">
          Y (ft)
          <input type="number" value={node.y} onChange={handleNumber("y")} />
        </label>
        <label className="field">
          Width (ft)
          <input type="number" value={node.w} onChange={handleNumber("w")} />
        </label>
        <label className="field">
          Height (ft)
          <input type="number" value={node.h} onChange={handleNumber("h")} />
        </label>
        <label className="field">
          Rotation (deg)
          <input type="number" value={node.rotationDeg} onChange={handleNumber("rotationDeg")} />
        </label>
      </div>
      {node.type === "workstation" && (
        <ListEditor
          label="Tools"
          values={node.props.tools}
          onChange={(values) => updateNode(node.id, { props: { ...node.props, tools: values } })}
        />
      )}
      {node.type === "shelf" && (
        <ListEditor
          label="Inventory / Subassemblies"
          values={node.props.inventory}
          onChange={(values) => updateNode(node.id, { props: { ...node.props, inventory: values } })}
        />
      )}
      {node.type === "dock" && (
        <ListEditor
          label="Dock Zones"
          values={node.props.zones}
          onChange={(values) => updateNode(node.id, { props: { ...node.props, zones: values } })}
        />
      )}
      {node.type === "lane" && (
        <label className="field">
          Lane Direction
          <select
            value={node.props.laneDirection ?? "inbound"}
            onChange={(event) =>
              updateNode(node.id, { props: { ...node.props, laneDirection: event.target.value as "inbound" | "outbound" } })
            }
          >
            <option value="inbound">Inbound</option>
            <option value="outbound">Outbound</option>
          </select>
        </label>
      )}
      {node.type === "door" && (
        <div className="grid-2">
          <label className="field">
            Door Type
            <select
              value={node.props.doorKind ?? "bay"}
              onChange={(event) =>
                updateNode(node.id, { props: { ...node.props, doorKind: event.target.value as "bay" | "man" } })
              }
            >
              <option value="bay">Bay door</option>
              <option value="man">Man door</option>
            </select>
          </label>
          <label className="field">
            Door Style
            <select
              value={node.props.doorStyle ?? "single"}
              onChange={(event) =>
                updateNode(node.id, { props: { ...node.props, doorStyle: event.target.value as "single" | "double" } })
              }
            >
              <option value="single">Single</option>
              <option value="double">Double</option>
            </select>
          </label>
        </div>
      )}
    </div>
  );
};

const FlowEditor = ({ flow }: { flow: Flow }) => {
  const updateFlow = useStore((state) => state.updateFlow);
  return (
    <div>
      <h3>Flow Properties</h3>
      <label className="field">
        Name
        <input value={flow.name} onChange={(event) => updateFlow(flow.id, { name: event.target.value })} />
      </label>
    </div>
  );
};

const SettingsPanel = () => {
  const floor = useStore((state) => state.floor);
  const grid = useStore((state) => state.grid);
  const sync = useStore((state) => state.sync);
  const setFloor = useStore((state) => state.setFloor);
  const setGrid = useStore((state) => state.setGrid);
  const setSyncEndpoint = useStore((state) => state.setSyncEndpoint);

  return (
    <div>
      <h3>Settings</h3>
      <div className="grid-2">
        <label className="field">
          Floor Width (ft)
          <input
            type="number"
            value={floor.width}
            onChange={(event) => setFloor({ ...floor, width: Number(event.target.value) })}
          />
        </label>
        <label className="field">
          Floor Length (ft)
          <input
            type="number"
            value={floor.length}
            onChange={(event) => setFloor({ ...floor, length: Number(event.target.value) })}
          />
        </label>
      </div>
      <label className="field">
        Units
        <input value="ft" readOnly />
      </label>
      <div className="grid-2">
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={grid.show}
            onChange={(event) => setGrid({ ...grid, show: event.target.checked })}
          />
          Show grid
        </label>
        <label className="field checkbox">
          <input
            type="checkbox"
            checked={grid.snap}
            onChange={(event) => setGrid({ ...grid, snap: event.target.checked })}
          />
          Snap to grid
        </label>
        <label className="field">
          Grid Size (ft)
          <select
            value={grid.size}
            onChange={(event) => setGrid({ ...grid, size: Number(event.target.value) })}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={5}>5</option>
          </select>
        </label>
      </div>
      <label className="field">
        Sync Endpoint
        <input
          placeholder="https://example.com/sync"
          value={sync.endpoint}
          onChange={(event) => setSyncEndpoint(event.target.value)}
        />
      </label>
    </div>
  );
};

export const PropertiesPanel = () => {
  const selection = useStore((state) => state.selection);
  const nodes = useStore((state) => state.nodes);
  const flows = useStore((state) => state.flows);

  const selectedNode = selection.type === "node" ? nodes.find((node) => node.id === selection.ids[0]) : null;
  const selectedFlow = selection.type === "flow" ? flows.find((flow) => flow.id === selection.ids[0]) : null;

  return (
    <div className="panel-section">
      {selectedNode && <NodeEditor node={selectedNode} />}
      {selectedFlow && <FlowEditor flow={selectedFlow} />}
      {!selectedNode && !selectedFlow && <SettingsPanel />}
    </div>
  );
};
