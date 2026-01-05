import { Point } from "../models/types";

export const BASE_PX_PER_FT = 20;

export interface Viewport {
  offsetX: number;
  offsetY: number;
  scale: number;
}

export const worldToScreen = (point: Point, viewport: Viewport): Point => ({
  x: point.x * BASE_PX_PER_FT * viewport.scale + viewport.offsetX,
  y: point.y * BASE_PX_PER_FT * viewport.scale + viewport.offsetY,
});

export const screenToWorld = (point: Point, viewport: Viewport): Point => ({
  x: (point.x - viewport.offsetX) / (BASE_PX_PER_FT * viewport.scale),
  y: (point.y - viewport.offsetY) / (BASE_PX_PER_FT * viewport.scale),
});
