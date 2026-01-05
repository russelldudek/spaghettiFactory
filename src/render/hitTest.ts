import { Flow, Node, Point } from "../models/types";

export const pointInRotatedRect = (point: Point, node: Node): boolean => {
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const angle = (-node.rotationDeg * Math.PI) / 180;
  const dx = point.x - cx;
  const dy = point.y - cy;
  const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
  return (
    Math.abs(rotatedX) <= node.w / 2 && Math.abs(rotatedY) <= node.h / 2
  );
};

const distanceToSegment = (point: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(point.x - a.x, point.y - a.y);
  let t = ((point.x - a.x) * dx + (point.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return Math.hypot(point.x - proj.x, point.y - proj.y);
};

export const hitTestNode = (point: Point, nodes: Node[]): Node | null => {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    if (pointInRotatedRect(point, nodes[i])) {
      return nodes[i];
    }
  }
  return null;
};

export const hitTestFlow = (point: Point, flows: Flow[], nodes: Node[]): Flow | null => {
  const threshold = 1.5;
  for (let i = flows.length - 1; i >= 0; i -= 1) {
    const flow = flows[i];
    const from = nodes.find((node) => node.id === flow.fromNodeId);
    const to = nodes.find((node) => node.id === flow.toNodeId);
    if (!from || !to) continue;
    const points: Point[] = [
      { x: from.x + from.w / 2, y: from.y + from.h / 2 },
      ...flow.waypoints,
      { x: to.x + to.w / 2, y: to.y + to.h / 2 },
    ];
    for (let j = 0; j < points.length - 1; j += 1) {
      const distance = distanceToSegment(point, points[j], points[j + 1]);
      if (distance <= threshold) {
        return flow;
      }
    }
  }
  return null;
};
