import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type WheelEvent } from "react";
import { FlowType, Node } from "../models/types";
import { renderCanvas } from "../render/canvasRenderer";
import { hitTestFlow, hitTestNode } from "../render/hitTest";
import { BASE_PX_PER_FT, Viewport, screenToWorld, worldToScreen } from "../render/transform";
import { createFlowTemplate, createNodeTemplate, useStore } from "../state/store";

interface DragState {
  type: "none" | "pan" | "move" | "resize" | "rotate";
  start: { x: number; y: number };
  startViewport?: Viewport;
  nodeId?: string;
  handle?: "nw" | "ne" | "sw" | "se";
  startNode?: Node;
}

const HANDLE_SIZE_FT = 0.6;
const ROTATE_HANDLE_OFFSET_FT = 1.2;

const snapValue = (value: number, gridSize: number) =>
  Math.round(value / gridSize) * gridSize;

const snapPoint = (point: { x: number; y: number }, gridSize: number) => ({
  x: snapValue(point.x, gridSize),
  y: snapValue(point.y, gridSize),
});

const getLocalPoint = (point: { x: number; y: number }, node: Node) => {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const angle = (-node.rotationDeg * Math.PI) / 180;
  return {
    x: dx * Math.cos(angle) - dy * Math.sin(angle),
    y: dx * Math.sin(angle) + dy * Math.cos(angle),
  };
};

const getHandleAtPoint = (point: { x: number; y: number }, node: Node): DragState["handle"] => {
  const local = getLocalPoint(point, node);
  const halfW = node.w / 2;
  const halfH = node.h / 2;
  const withinX = (value: number, target: number) => Math.abs(value - target) <= HANDLE_SIZE_FT;
  const withinY = (value: number, target: number) => Math.abs(value - target) <= HANDLE_SIZE_FT;
  if (withinX(local.x, -halfW) && withinY(local.y, -halfH)) return "nw";
  if (withinX(local.x, halfW) && withinY(local.y, -halfH)) return "ne";
  if (withinX(local.x, -halfW) && withinY(local.y, halfH)) return "sw";
  if (withinX(local.x, halfW) && withinY(local.y, halfH)) return "se";
  return undefined;
};

const isRotateHandle = (point: { x: number; y: number }, node: Node) => {
  const local = getLocalPoint(point, node);
  const halfH = node.h / 2;
  return (
    Math.abs(local.x) <= HANDLE_SIZE_FT &&
    Math.abs(local.y + halfH + ROTATE_HANDLE_OFFSET_FT) <= HANDLE_SIZE_FT
  );
};

export const CanvasStage = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<Viewport>({
    offsetX: 40,
    offsetY: 40,
    scale: 1,
  });
  const [dragState, setDragState] = useState<DragState>({ type: "none", start: { x: 0, y: 0 } });
  const [flowDraft, setFlowDraft] = useState<{ type: FlowType; fromNodeId: string; waypoints: { x: number; y: number }[] } | null>(null);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [time, setTime] = useState(0);

  const nodes = useStore((state) => state.nodes);
  const flows = useStore((state) => state.flows);
  const grid = useStore((state) => state.grid);
  const floor = useStore((state) => state.floor);
  const selection = useStore((state) => state.selection);
  const tool = useStore((state) => state.tool);
  const animate = useStore((state) => state.animate);
  const addNode = useStore((state) => state.addNode);
  const updateNode = useStore((state) => state.updateNode);
  const setSelection = useStore((state) => state.setSelection);
  const clearSelection = useStore((state) => state.clearSelection);
  const addFlow = useStore((state) => state.addFlow);
  const deleteSelection = useStore((state) => state.deleteSelection);
  const duplicateNode = useStore((state) => state.duplicateNode);

  const selectionIds = useMemo(
    () => ({
      nodeIds: selection.type === "node" ? selection.ids : [],
      flowIds: selection.type === "flow" ? selection.ids : [],
    }),
    [selection]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === " ") {
        setIsSpaceDown(true);
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        deleteSelection();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        setIsSpaceDown(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [deleteSelection]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    let animationFrame: number;
    const tick = (timestamp: number) => {
      setTime(timestamp);
      animationFrame = requestAnimationFrame(tick);
    };
    if (animate) {
      animationFrame = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [animate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderCanvas({
      ctx,
      nodes,
      flows,
      floor,
      grid,
      viewport,
      selection: selectionIds,
      animate,
      time,
    });

    const selectedNode = nodes.find((node) => selectionIds.nodeIds.includes(node.id));
    if (selectedNode) {
      const center = worldToScreen({ x: selectedNode.x + selectedNode.w / 2, y: selectedNode.y + selectedNode.h / 2 }, viewport);
      const width = selectedNode.w * BASE_PX_PER_FT * viewport.scale;
      const height = selectedNode.h * BASE_PX_PER_FT * viewport.scale;
      ctx.save();
      ctx.translate(center.x, center.y);
      ctx.rotate((selectedNode.rotationDeg * Math.PI) / 180);
      ctx.strokeStyle = "#ff6b6b";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-width / 2, -height / 2, width, height);
      ctx.fillStyle = "#ff6b6b";
      const handles = [
        { x: -width / 2, y: -height / 2 },
        { x: width / 2, y: -height / 2 },
        { x: -width / 2, y: height / 2 },
        { x: width / 2, y: height / 2 },
      ];
      handles.forEach((handle) => {
        ctx.fillRect(handle.x - 4, handle.y - 4, 8, 8);
      });
      ctx.beginPath();
      ctx.arc(0, -height / 2 - ROTATE_HANDLE_OFFSET_FT * BASE_PX_PER_FT * viewport.scale, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [nodes, flows, floor, grid, viewport, selectionIds, animate, time]);

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, viewport);
    const isPanMode = tool === "pan" || isSpaceDown || event.button === 1;
    if (isPanMode) {
      setDragState({ type: "pan", start: { x: event.clientX, y: event.clientY }, startViewport: viewport });
      return;
    }

    const hitNode = hitTestNode(point, nodes);
    const hitFlow = hitTestFlow(point, flows, nodes);

    if (tool === "add-flow-product" || tool === "add-flow-person") {
      if (hitNode) {
        if (!flowDraft) {
          setFlowDraft({ type: tool === "add-flow-product" ? "product" : "person", fromNodeId: hitNode.id, waypoints: [] });
          setSelection({ type: "node", ids: [hitNode.id] });
        } else {
          const template = createFlowTemplate(flowDraft.type, flowDraft.fromNodeId, hitNode.id);
          addFlow({ ...template, waypoints: flowDraft.waypoints });
          setFlowDraft(null);
        }
      } else if (flowDraft && event.shiftKey) {
        const snapped = grid.snap ? snapPoint(point, grid.size) : point;
        setFlowDraft({ ...flowDraft, waypoints: [...flowDraft.waypoints, snapped] });
      }
      return;
    }

    if (hitNode) {
      const handle = getHandleAtPoint(point, hitNode);
      if (handle) {
        setDragState({ type: "resize", start: point, nodeId: hitNode.id, handle, startNode: hitNode });
        return;
      }
      if (isRotateHandle(point, hitNode)) {
        setDragState({ type: "rotate", start: point, nodeId: hitNode.id, startNode: hitNode });
        return;
      }

      if (event.metaKey || event.ctrlKey) {
        const duplicatedId = duplicateNode(hitNode.id);
        if (duplicatedId) {
          setDragState({ type: "move", start: point, nodeId: duplicatedId, startNode: { ...hitNode, id: duplicatedId } });
        }
      } else {
        if (event.shiftKey && selection.type === "node") {
          setSelection({ type: "node", ids: Array.from(new Set([...selection.ids, hitNode.id])) });
        } else {
          setSelection({ type: "node", ids: [hitNode.id] });
        }
        setDragState({ type: "move", start: point, nodeId: hitNode.id, startNode: hitNode });
      }
      return;
    }

    if (hitFlow) {
      setSelection({ type: "flow", ids: [hitFlow.id] });
      return;
    }

    clearSelection();
  };

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (dragState.type === "none") return;
    if (dragState.type === "pan" && dragState.startViewport) {
      const dx = event.clientX - dragState.start.x;
      const dy = event.clientY - dragState.start.y;
      setViewport({
        ...dragState.startViewport,
        offsetX: dragState.startViewport.offsetX + dx,
        offsetY: dragState.startViewport.offsetY + dy,
      });
      return;
    }
    if (!dragState.nodeId || !dragState.startNode) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const point = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, viewport);

    if (dragState.type === "move") {
      const dx = point.x - dragState.start.x;
      const dy = point.y - dragState.start.y;
      let newX = dragState.startNode.x + dx;
      let newY = dragState.startNode.y + dy;
      if (grid.snap) {
        const snapped = snapPoint({ x: newX, y: newY }, grid.size);
        newX = snapped.x;
        newY = snapped.y;
      }
      updateNode(dragState.nodeId, { x: newX, y: newY });
    }

    if (dragState.type === "resize" && dragState.handle) {
      const local = getLocalPoint(point, dragState.startNode);
      let newW = dragState.startNode.w;
      let newH = dragState.startNode.h;
      const halfW = dragState.startNode.w / 2;
      const halfH = dragState.startNode.h / 2;
      if (dragState.handle.includes("e")) {
        newW = Math.max(1, halfW + local.x) * 2;
      }
      if (dragState.handle.includes("w")) {
        newW = Math.max(1, halfW - local.x) * 2;
      }
      if (dragState.handle.includes("s")) {
        newH = Math.max(1, halfH + local.y) * 2;
      }
      if (dragState.handle.includes("n")) {
        newH = Math.max(1, halfH - local.y) * 2;
      }
      if (grid.snap) {
        newW = snapValue(newW, grid.size);
        newH = snapValue(newH, grid.size);
      }
      updateNode(dragState.nodeId, { w: newW, h: newH });
    }

    if (dragState.type === "rotate") {
      const center = { x: dragState.startNode.x + dragState.startNode.w / 2, y: dragState.startNode.y + dragState.startNode.h / 2 };
      const angle = Math.atan2(point.y - center.y, point.x - center.x);
      updateNode(dragState.nodeId, { rotationDeg: (angle * 180) / Math.PI });
    }
  };

  const handlePointerUp = () => {
    setDragState({ type: "none", start: { x: 0, y: 0 } });
  };

  const handleWheel = (event: WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const cursor = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(3, Math.max(0.3, viewport.scale * zoomFactor));
    const worldBefore = screenToWorld(cursor, viewport);
    const newViewport = { ...viewport, scale: newScale };
    const screenAfter = worldToScreen(worldBefore, newViewport);
    setViewport({
      ...newViewport,
      offsetX: viewport.offsetX + (cursor.x - screenAfter.x),
      offsetY: viewport.offsetY + (cursor.y - screenAfter.y),
    });
  };

  const handleDoubleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const point = screenToWorld({ x: event.clientX - rect.left, y: event.clientY - rect.top }, viewport);
    const snapped = grid.snap ? snapPoint(point, grid.size) : point;
    addNode({
      ...createNodeTemplate("workstation"),
      x: snapped.x,
      y: snapped.y,
    });
  };

  return (
    <div className="canvas-stage" ref={containerRef}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      />
      <div className="canvas-hint">
        <div>Pan: space + drag | Zoom: wheel | Duplicate: Ctrl/Cmd + drag</div>
        {flowDraft && <div>Flow drafting: click target node to finish. Shift-click empty to add waypoint.</div>}
      </div>
    </div>
  );
};
