import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AppStateData,
  Flow,
  FlowType,
  GridSettings,
  Node,
  NodeType,
  Selection,
  SyncStatus,
  ToolMode,
} from "../models/types";
import { sampleState } from "../sampleState";
import { ManualEndpointAdapter } from "../sync/manualEndpointAdapter";

const createId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

const baseState: AppStateData = {
  floor: { width: 100, length: 60 },
  grid: { show: true, snap: true, size: 1 },
  nodes: [],
  flows: [],
  lastModified: Date.now(),
};

const touchData = <T extends AppStateData>(state: T): T => ({
  ...state,
  lastModified: Date.now(),
});

const touchStore = (state: StoreState): StoreState => ({
  ...state,
  lastModified: Date.now(),
});

const normalizeFloor = (floor: Partial<AppStateData["floor"]> & { height?: number }) => ({
  width: floor.width ?? baseState.floor.width,
  length: floor.length ?? floor.height ?? baseState.floor.length,
});

export interface StoreState extends AppStateData {
  selection: Selection;
  tool: ToolMode;
  animate: boolean;
  sync: SyncStatus;
  setTool: (tool: ToolMode) => void;
  setAnimate: (value: boolean) => void;
  setSelection: (selection: Selection) => void;
  clearSelection: () => void;
  addNode: (node: Omit<Node, "id">) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  removeNode: (id: string) => void;
  addFlow: (flow: Omit<Flow, "id">) => void;
  updateFlow: (id: string, updates: Partial<Flow>) => void;
  removeFlow: (id: string) => void;
  setFloor: (floor: AppStateData["floor"]) => void;
  setGrid: (grid: GridSettings) => void;
  loadSample: () => void;
  resetAll: () => void;
  importState: (state: AppStateData) => void;
  duplicateNode: (id: string) => string | null;
  deleteSelection: () => void;
  setSyncEndpoint: (endpoint: string) => void;
  pullSync: () => Promise<void>;
  pushSync: () => Promise<void>;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      ...baseState,
      selection: { type: null, ids: [] },
      tool: "select",
      animate: false,
      sync: { endpoint: "", status: "idle" },
      setTool: (tool) => set({ tool }),
      setAnimate: (value) => set({ animate: value }),
      setSelection: (selection) => set({ selection }),
      clearSelection: () => set({ selection: { type: null, ids: [] } }),
      addNode: (node) =>
        set((state) => {
          const newNode: Node = { ...node, id: createId("node") };
          return touchStore({
            ...state,
            nodes: [...state.nodes, newNode],
            selection: { type: "node", ids: [newNode.id] },
          });
        }),
      updateNode: (id, updates) =>
        set((state) =>
          touchStore({
            ...state,
            nodes: state.nodes.map((node) =>
              node.id === id ? { ...node, ...updates } : node
            ),
          })
        ),
      removeNode: (id) =>
        set((state) =>
          touchStore({
            ...state,
            nodes: state.nodes.filter((node) => node.id !== id),
            flows: state.flows.filter(
              (flow) => flow.fromNodeId !== id && flow.toNodeId !== id
            ),
            selection: { type: null, ids: [] },
          })
        ),
      addFlow: (flow) =>
        set((state) => {
          const newFlow: Flow = { ...flow, id: createId("flow") };
          return touchStore({
            ...state,
            flows: [...state.flows, newFlow],
            selection: { type: "flow", ids: [newFlow.id] },
          });
        }),
      updateFlow: (id, updates) =>
        set((state) =>
          touchStore({
            ...state,
            flows: state.flows.map((flow) =>
              flow.id === id ? { ...flow, ...updates } : flow
            ),
          })
        ),
      removeFlow: (id) =>
        set((state) =>
          touchStore({
            ...state,
            flows: state.flows.filter((flow) => flow.id !== id),
            selection: { type: null, ids: [] },
          })
        ),
      setFloor: (floor) => set((state) => touchStore({ ...state, floor: normalizeFloor(floor) })),
      setGrid: (grid) => set((state) => touchStore({ ...state, grid })),
      loadSample: () => set(() => ({ ...sampleState, selection: { type: null, ids: [] }, tool: "select", animate: false, sync: { endpoint: "", status: "idle" } })),
      resetAll: () => set(() => ({ ...baseState, selection: { type: null, ids: [] }, tool: "select", animate: false, sync: { endpoint: "", status: "idle" } })),
      importState: (stateData) =>
        set(() => ({
          ...touchData({ ...stateData, floor: normalizeFloor(stateData.floor) }),
          selection: { type: null, ids: [] },
          tool: "select",
          animate: false,
          sync: { endpoint: get().sync.endpoint, status: "idle" },
        })),
      duplicateNode: (id) => {
        const node = get().nodes.find((item) => item.id === id);
        if (!node) return null;
        const duplicated: Node = {
          ...node,
          id: createId("node"),
          name: `${node.name} Copy`,
          x: node.x + 2,
          y: node.y + 2,
        };
        set((state) =>
          touchStore({
            ...state,
            nodes: [...state.nodes, duplicated],
            selection: { type: "node", ids: [duplicated.id] },
          })
        );
        return duplicated.id;
      },
      deleteSelection: () => {
        const selection = get().selection;
        if (selection.type === "node") {
          selection.ids.forEach((id) => get().removeNode(id));
        }
        if (selection.type === "flow") {
          selection.ids.forEach((id) => get().removeFlow(id));
        }
        set({ selection: { type: null, ids: [] } });
      },
      setSyncEndpoint: (endpoint) =>
        set((state) => ({ sync: { ...state.sync, endpoint } })),
      pullSync: async () => {
        const { sync } = get();
        if (!sync.endpoint) return;
        set({ sync: { ...sync, status: "syncing", warning: undefined, errorMessage: undefined } });
        try {
          const adapter = new ManualEndpointAdapter(sync.endpoint);
          const remote = await adapter.load();
          const localModified = get().lastModified;
          const remoteModified = remote.lastModified ?? 0;
          if (remoteModified >= localModified) {
            set(() => ({
              ...remote,
              selection: { type: null, ids: [] },
              tool: "select",
              animate: false,
              sync: {
                ...get().sync,
                status: "idle",
                lastPull: Date.now(),
                warning: remoteModified > localModified ? "Remote state was newer and replaced local layout." : undefined,
              },
            }));
          } else {
            set({
              sync: {
                ...get().sync,
                status: "idle",
                lastPull: Date.now(),
                warning: "Local state is newer. Remote was not applied.",
              },
            });
          }
        } catch (error) {
          set({ sync: { ...get().sync, status: "error", errorMessage: (error as Error).message } });
        }
      },
      pushSync: async () => {
        const { sync } = get();
        if (!sync.endpoint) return;
        set({ sync: { ...sync, status: "syncing", warning: undefined, errorMessage: undefined } });
        try {
          const adapter = new ManualEndpointAdapter(sync.endpoint);
          const payload: AppStateData = {
            nodes: get().nodes,
            flows: get().flows,
            floor: get().floor,
            grid: get().grid,
            lastModified: get().lastModified,
          };
          await adapter.save(payload);
          set({ sync: { ...get().sync, status: "idle", lastPush: Date.now() } });
        } catch (error) {
          set({ sync: { ...get().sync, status: "error", errorMessage: (error as Error).message } });
        }
      },
    }),
    {
      name: "spaghetti-factory-store",
      partialize: (state) => ({
        nodes: state.nodes,
        flows: state.flows,
        floor: state.floor,
        grid: state.grid,
        lastModified: state.lastModified,
        sync: state.sync,
      }),
      merge: (persisted, current) => {
        const persistedState = persisted as StoreState;
        return {
          ...current,
          ...persistedState,
          floor: normalizeFloor(persistedState.floor ?? {}),
          selection: { type: null, ids: [] },
          tool: "select",
          animate: false,
        };
      },
    }
  )
);

export const createNodeTemplate = (type: NodeType): Omit<Node, "id"> => {
  const base = {
    type,
    name: `${type[0].toUpperCase()}${type.slice(1)}`,
    x: 10,
    y: 10,
    w: 8,
    h: 6,
    rotationDeg: 0,
    props: {},
  };

  if (type === "workstation") {
    return { ...base, w: 12, h: 8, props: { tools: [] } };
  }
  if (type === "shelf") {
    return { ...base, w: 10, h: 6, props: { inventory: [] } };
  }
  if (type === "dock") {
    return { ...base, w: 20, h: 10, props: { zones: ["Zone"] } };
  }
  if (type === "lane") {
    return { ...base, w: 16, h: 4, props: { laneDirection: "inbound" } };
  }
  if (type === "door") {
    return { ...base, w: 4, h: 3, props: { doorKind: "bay", doorStyle: "single" } };
  }
  if (type === "bench") {
    return { ...base, w: 10, h: 4, props: { benchShape: "straight", benchDepth: 2 } };
  }
  if (type === "person") {
    return { ...base, w: 3, h: 3 };
  }
  return base;
};

export const createFlowTemplate = (type: FlowType, fromNodeId: string, toNodeId: string): Omit<Flow, "id"> => ({
  type,
  name: `${type === "product" ? "Product" : "Person"} Flow`,
  fromNodeId,
  toNodeId,
  waypoints: [],
});
