import { useMemo } from "react";
import { Flow, Node } from "../models/types";
import { useStore } from "../state/store";

const flowDistance = (flow: Flow, nodes: Node[]) => {
  const from = nodes.find((node) => node.id === flow.fromNodeId);
  const to = nodes.find((node) => node.id === flow.toNodeId);
  if (!from || !to) return 0;
  const points = [
    { x: from.x + from.w / 2, y: from.y + from.h / 2 },
    ...flow.waypoints,
    { x: to.x + to.w / 2, y: to.y + to.h / 2 },
  ];
  return points.reduce((sum, point, index) => {
    if (index === 0) return sum;
    const prev = points[index - 1];
    return sum + Math.hypot(point.x - prev.x, point.y - prev.y);
  }, 0);
};

export const StatsPanel = () => {
  const nodes = useStore((state) => state.nodes);
  const flows = useStore((state) => state.flows);

  const stats = useMemo(() => {
    let productTotal = 0;
    let personTotal = 0;
    flows.forEach((flow) => {
      const distance = flowDistance(flow, nodes);
      if (flow.type === "product") {
        productTotal += distance;
      } else {
        personTotal += distance;
      }
    });
    return { productTotal, personTotal };
  }, [flows, nodes]);

  return (
    <div className="panel-section">
      <h3>Flow Stats</h3>
      <div className="stat-row">Product total: {stats.productTotal.toFixed(1)} ft</div>
      <div className="stat-row">Person total: {stats.personTotal.toFixed(1)} ft</div>
      <div className="stat-note">Distances are calculated along flow waypoints.</div>
    </div>
  );
};
