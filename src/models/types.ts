export type NodeType = "workstation" | "person" | "shelf" | "dock" | "lane" | "door";
export type FlowType = "product" | "person";

export interface Point {
  x: number;
  y: number;
}

export interface NodeProps {
  tools?: string[];
  inventory?: string[];
  zones?: string[];
  laneDirection?: "inbound" | "outbound";
  doorKind?: "bay" | "man";
  doorStyle?: "single" | "double";
}

export interface Node {
  id: string;
  type: NodeType;
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rotationDeg: number;
  props: NodeProps;
}

export interface Flow {
  id: string;
  type: FlowType;
  name: string;
  fromNodeId: string;
  toNodeId: string;
  waypoints: Point[];
}

export interface FloorSettings {
  width: number;
  length: number;
}

export interface GridSettings {
  show: boolean;
  snap: boolean;
  size: number;
}

export interface AppStateData {
  nodes: Node[];
  flows: Flow[];
  floor: FloorSettings;
  grid: GridSettings;
  lastModified: number;
}

export type Selection =
  | { type: "node"; ids: string[] }
  | { type: "flow"; ids: string[] }
  | { type: null; ids: string[] };

export type ToolMode =
  | "select"
  | "pan"
  | "add-flow-product"
  | "add-flow-person";

export interface SyncStatus {
  endpoint: string;
  status: "idle" | "syncing" | "error";
  lastPull?: number;
  lastPush?: number;
  warning?: string;
  errorMessage?: string;
}
