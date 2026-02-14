import type { Point } from '$lib/models/types';
import { addWall, beginUndoGroup, endUndoGroup } from '$lib/stores/project';

export interface RoomPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  getWalls: (w: number, h: number) => { start: Point; end: Point }[];
}

export const roomPresets: RoomPreset[] = [
  {
    id: 'rectangle',
    name: 'Rectangle',
    icon: '▭',
    description: 'Simple rectangular room',
    getWalls: (w, h) => [
      { start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
      { start: { x: w, y: 0 }, end: { x: w, y: h } },
      { start: { x: w, y: h }, end: { x: 0, y: h } },
      { start: { x: 0, y: h }, end: { x: 0, y: 0 } },
    ],
  },
  {
    id: 'l-shape',
    name: 'L-Shape',
    icon: '⌐',
    description: 'L-shaped room',
    getWalls: (w, h) => {
      const hw = w / 2, hh = h / 2;
      return [
        { start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
        { start: { x: w, y: 0 }, end: { x: w, y: hh } },
        { start: { x: w, y: hh }, end: { x: hw, y: hh } },
        { start: { x: hw, y: hh }, end: { x: hw, y: h } },
        { start: { x: hw, y: h }, end: { x: 0, y: h } },
        { start: { x: 0, y: h }, end: { x: 0, y: 0 } },
      ];
    },
  },
  {
    id: 't-shape',
    name: 'T-Shape',
    icon: '⊤',
    description: 'T-shaped room',
    getWalls: (w, h) => {
      const qw = w / 4, hh = h / 2;
      return [
        { start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
        { start: { x: w, y: 0 }, end: { x: w, y: hh } },
        { start: { x: w, y: hh }, end: { x: w - qw, y: hh } },
        { start: { x: w - qw, y: hh }, end: { x: w - qw, y: h } },
        { start: { x: w - qw, y: h }, end: { x: qw, y: h } },
        { start: { x: qw, y: h }, end: { x: qw, y: hh } },
        { start: { x: qw, y: hh }, end: { x: 0, y: hh } },
        { start: { x: 0, y: hh }, end: { x: 0, y: 0 } },
      ];
    },
  },
  {
    id: 'u-shape',
    name: 'U-Shape',
    icon: '⊔',
    description: 'U-shaped room',
    getWalls: (w, h) => {
      const qw = w / 4, hh = h / 2;
      return [
        { start: { x: 0, y: 0 }, end: { x: qw, y: 0 } },
        { start: { x: qw, y: 0 }, end: { x: qw, y: hh } },
        { start: { x: qw, y: hh }, end: { x: w - qw, y: hh } },
        { start: { x: w - qw, y: hh }, end: { x: w - qw, y: 0 } },
        { start: { x: w - qw, y: 0 }, end: { x: w, y: 0 } },
        { start: { x: w, y: 0 }, end: { x: w, y: h } },
        { start: { x: w, y: h }, end: { x: 0, y: h } },
        { start: { x: 0, y: h }, end: { x: 0, y: 0 } },
      ];
    },
  },
];

export function placePreset(preset: RoomPreset, origin: Point, w = 400, h = 300): void {
  const walls = preset.getWalls(w, h);
  // Compute bounding box center so preset is centered on drop point
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const wall of walls) {
    for (const pt of [wall.start, wall.end]) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  beginUndoGroup();
  for (const wall of walls) {
    addWall(
      { x: origin.x + wall.start.x - cx, y: origin.y + wall.start.y - cy },
      { x: origin.x + wall.end.x - cx, y: origin.y + wall.end.y - cy }
    );
  }
  endUndoGroup();
}
