import { Flow, Node, Point } from "../models/types";
import { BASE_PX_PER_FT, Viewport, worldToScreen } from "./transform";

const nodeColors: Record<string, string> = {
  workstation: "#4c6fff",
  person: "#ff9f43",
  shelf: "#10ac84",
  dock: "#576574",
  lane: "#1dd1a1",
  door: "#f368e0",
  bench: "#a55eea",
};

export interface RenderOptions {
  ctx: CanvasRenderingContext2D;
  nodes: Node[];
  flows: Flow[];
  floor: { width: number; length: number };
  grid: { show: boolean; size: number };
  viewport: Viewport;
  selection: { nodeIds: string[]; flowIds: string[] };
  animate: boolean;
  time: number;
}

const drawGrid = (
  ctx: CanvasRenderingContext2D,
  floor: { width: number; length: number },
  gridSize: number,
  viewport: Viewport
) => {
  ctx.save();
  ctx.strokeStyle = "rgba(200,200,200,0.35)";
  ctx.lineWidth = 1;
  const step = gridSize * BASE_PX_PER_FT * viewport.scale;
  const totalWidth = floor.width * BASE_PX_PER_FT * viewport.scale;
  const totalHeight = floor.length * BASE_PX_PER_FT * viewport.scale;
  const startX = viewport.offsetX;
  const startY = viewport.offsetY;
  for (let x = 0; x <= totalWidth; x += step) {
    ctx.beginPath();
    ctx.moveTo(startX + x, startY);
    ctx.lineTo(startX + x, startY + totalHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= totalHeight; y += step) {
    ctx.beginPath();
    ctx.moveTo(startX, startY + y);
    ctx.lineTo(startX + totalWidth, startY + y);
    ctx.stroke();
  }
  ctx.restore();
};

const drawNode = (ctx: CanvasRenderingContext2D, node: Node, viewport: Viewport, selected: boolean) => {
  const { x, y, w, h, rotationDeg } = node;
  const centerWorld = { x: x + w / 2, y: y + h / 2 };
  const center = worldToScreen(centerWorld, viewport);
  const width = w * BASE_PX_PER_FT * viewport.scale;
  const height = h * BASE_PX_PER_FT * viewport.scale;

  ctx.save();
  ctx.translate(center.x, center.y);
  ctx.rotate((rotationDeg * Math.PI) / 180);
  ctx.fillStyle = nodeColors[node.type] ?? "#888";
  ctx.strokeStyle = selected ? "#ff4757" : "#222";
  ctx.lineWidth = selected ? 3 : 1.5;

  if (node.type === "bench" && node.props.benchShape === "l") {
    const depthWorld = node.props.benchDepth ?? Math.min(w, h) / 3;
    const depth = Math.min(Math.max(depthWorld * BASE_PX_PER_FT * viewport.scale, 0), width, height);
    const left = -width / 2;
    const top = -height / 2;
    const bottom = height / 2;
    ctx.beginPath();
    ctx.rect(left, top, depth, height);
    ctx.rect(left, bottom - depth, width, depth);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(-width / 2, -height / 2, width, height);
    ctx.strokeRect(-width / 2, -height / 2, width, height);
  }
  ctx.fillStyle = "#fff";
  ctx.font = `${12 * viewport.scale}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(node.name, 0, 0, width - 6);
  ctx.restore();
};

const drawFlow = (
  ctx: CanvasRenderingContext2D,
  flow: Flow,
  nodes: Node[],
  viewport: Viewport,
  selected: boolean
) => {
  const from = nodes.find((node) => node.id === flow.fromNodeId);
  const to = nodes.find((node) => node.id === flow.toNodeId);
  if (!from || !to) return;
  const points: Point[] = [
    { x: from.x + from.w / 2, y: from.y + from.h / 2 },
    ...flow.waypoints,
    { x: to.x + to.w / 2, y: to.y + to.h / 2 },
  ];
  ctx.save();
  ctx.strokeStyle = flow.type === "product" ? "#222" : "#222";
  ctx.setLineDash(flow.type === "person" ? [8, 6] : []);
  ctx.lineWidth = selected ? 3 : 2;
  ctx.beginPath();
  points.forEach((point, index) => {
    const screen = worldToScreen(point, viewport);
    if (index === 0) {
      ctx.moveTo(screen.x, screen.y);
    } else {
      ctx.lineTo(screen.x, screen.y);
    }
  });
  ctx.stroke();
  ctx.setLineDash([]);

  const end = worldToScreen(points[points.length - 1], viewport);
  const prev = worldToScreen(points[points.length - 2], viewport);
  const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
  ctx.fillStyle = flow.type === "product" ? "#111" : "#111";
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(end.x - 10 * Math.cos(angle - Math.PI / 6), end.y - 10 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(end.x - 10 * Math.cos(angle + Math.PI / 6), end.y - 10 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();

  ctx.restore();
};

const drawFloorBounds = (ctx: CanvasRenderingContext2D, floor: { width: number; length: number }, viewport: Viewport) => {
  const topLeft = worldToScreen({ x: 0, y: 0 }, viewport);
  const width = floor.width * BASE_PX_PER_FT * viewport.scale;
  const height = floor.length * BASE_PX_PER_FT * viewport.scale;
  ctx.save();
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  ctx.strokeRect(topLeft.x, topLeft.y, width, height);
  ctx.restore();
};

const animateTokens = (
  ctx: CanvasRenderingContext2D,
  flow: Flow,
  nodes: Node[],
  viewport: Viewport,
  time: number
) => {
  const from = nodes.find((node) => node.id === flow.fromNodeId);
  const to = nodes.find((node) => node.id === flow.toNodeId);
  if (!from || !to) return;
  const points: Point[] = [
    { x: from.x + from.w / 2, y: from.y + from.h / 2 },
    ...flow.waypoints,
    { x: to.x + to.w / 2, y: to.y + to.h / 2 },
  ];
  const lengths: number[] = [];
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.hypot(dx, dy);
    lengths.push(len);
    total += len;
  }
  if (total === 0) return;
  const speed = flow.type === "product" ? 0.6 : 1;
  const distance = ((time / 1000) * speed) % total;
  let traveled = 0;
  let segmentIndex = 0;
  while (segmentIndex < lengths.length && traveled + lengths[segmentIndex] < distance) {
    traveled += lengths[segmentIndex];
    segmentIndex += 1;
  }
  const remaining = distance - traveled;
  const start = points[segmentIndex];
  const end = points[segmentIndex + 1];
  if (!start || !end) return;
  const ratio = lengths[segmentIndex] ? remaining / lengths[segmentIndex] : 0;
  const token = {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
  const screen = worldToScreen(token, viewport);
  ctx.save();
  ctx.fillStyle = flow.type === "product" ? "#222" : "#ff9f43";
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 4 * viewport.scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

export const renderCanvas = (options: RenderOptions) => {
  const { ctx, nodes, flows, floor, grid, viewport, selection, animate, time } = options;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  if (grid.show) {
    drawGrid(ctx, floor, grid.size, viewport);
  }
  drawFloorBounds(ctx, floor, viewport);
  flows.forEach((flow) =>
    drawFlow(ctx, flow, nodes, viewport, selection.flowIds.includes(flow.id))
  );
  nodes.forEach((node) => drawNode(ctx, node, viewport, selection.nodeIds.includes(node.id)));
  if (animate) {
    flows.forEach((flow) => animateTokens(ctx, flow, nodes, viewport, time));
  }
};
