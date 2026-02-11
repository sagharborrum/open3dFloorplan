import type { Wall, Point, Room } from '$lib/models/types';

const EPSILON = 5; // snap distance for matching endpoints

function ptEq(a: Point, b: Point): boolean {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

interface Edge {
  wallId: string;
  start: Point;
  end: Point;
}

/**
 * Detect enclosed rooms from a set of walls using a simple graph-cycle approach.
 * Returns detected rooms with wall ids, centroid, and area.
 */
export function detectRooms(walls: Wall[]): Room[] {
  if (walls.length < 3) return [];

  // Build adjacency: collect unique vertices & edges
  const vertices: Point[] = [];
  const edges: Edge[] = [];

  function findOrAddVertex(p: Point): number {
    for (let i = 0; i < vertices.length; i++) {
      if (ptEq(vertices[i], p)) return i;
    }
    vertices.push({ x: p.x, y: p.y });
    return vertices.length - 1;
  }

  for (const w of walls) {
    const si = findOrAddVertex(w.start);
    const ei = findOrAddVertex(w.end);
    if (si !== ei) {
      edges.push({ wallId: w.id, start: vertices[si], end: vertices[ei] });
    }
  }

  // Build adjacency list
  const adj = new Map<number, { to: number; wallId: string; angle: number }[]>();
  for (const e of edges) {
    const si = findOrAddVertex(e.start);
    const ei = findOrAddVertex(e.end);
    const angle1 = Math.atan2(e.end.y - e.start.y, e.end.x - e.start.x);
    const angle2 = Math.atan2(e.start.y - e.end.y, e.start.x - e.end.x);
    if (!adj.has(si)) adj.set(si, []);
    if (!adj.has(ei)) adj.set(ei, []);
    adj.get(si)!.push({ to: ei, wallId: e.wallId, angle: angle1 });
    adj.get(ei)!.push({ to: si, wallId: e.wallId, angle: angle2 });
  }

  // Sort adjacency by angle for each vertex
  for (const [, neighbors] of adj) {
    neighbors.sort((a, b) => a.angle - b.angle);
  }

  // Find minimal cycles using "next edge" (leftmost turn) traversal
  const usedDirected = new Set<string>();
  const rooms: Room[] = [];
  let roomCount = 0;

  for (const e of edges) {
    const si = findOrAddVertex(e.start);
    const ei = findOrAddVertex(e.end);
    for (const [from, to] of [[si, ei], [ei, si]]) {
      const key = `${from}-${to}`;
      if (usedDirected.has(key)) continue;

      // Trace cycle
      const cycle: number[] = [from];
      const wallIds: string[] = [];
      let cur = from;
      let next = to;
      let valid = true;

      for (let step = 0; step < 20; step++) {
        const dk = `${cur}-${next}`;
        if (usedDirected.has(dk)) { valid = false; break; }
        usedDirected.add(dk);
        cycle.push(next);

        // Find the wall for this edge
        const neighbors = adj.get(cur);
        const edgeInfo = neighbors?.find(n => n.to === next);
        if (edgeInfo) wallIds.push(edgeInfo.wallId);

        if (next === from && cycle.length > 3) break; // closed

        // Find next: leftmost turn
        const inAngle = Math.atan2(vertices[cur].y - vertices[next].y, vertices[cur].x - vertices[next].x);
        const neighbors2 = adj.get(next);
        if (!neighbors2 || neighbors2.length < 2) { valid = false; break; }

        // Find the edge just after inAngle (next CCW)
        let bestIdx = -1;
        let bestDelta = Infinity;
        for (let i = 0; i < neighbors2.length; i++) {
          if (neighbors2[i].to === cur && neighbors2.length > 1) continue; // skip going back if possible
          let delta = neighbors2[i].angle - inAngle;
          if (delta <= 1e-9) delta += Math.PI * 2;
          if (delta < bestDelta) {
            bestDelta = delta;
            bestIdx = i;
          }
        }
        if (bestIdx === -1) { valid = false; break; }

        cur = next;
        next = neighbors2[bestIdx].to;
      }

      if (!valid || cycle[cycle.length - 1] !== from || cycle.length < 4) continue;

      // Compute area using shoelace
      const poly = cycle.slice(0, -1).map(i => vertices[i]);
      const area = Math.abs(shoelace(poly));
      
      // Skip very large or tiny areas
      if (area < 1000 || area > 10000000) continue;

      // Compute centroid
      const cx = poly.reduce((s, p) => s + p.x, 0) / poly.length;
      const cy = poly.reduce((s, p) => s + p.y, 0) / poly.length;

      // Check if this room overlaps with existing (same walls)
      const uniqueWalls = [...new Set(wallIds)];
      const dup = rooms.some(r => {
        const rw = new Set(r.walls);
        return uniqueWalls.length === rw.size && uniqueWalls.every(w => rw.has(w));
      });
      if (dup) continue;

      roomCount++;
      rooms.push({
        id: `room-${roomCount}-${Date.now()}`,
        name: `Room ${roomCount}`,
        walls: uniqueWalls,
        floorTexture: 'hardwood',
        area: Math.round(area / 10000 * 100) / 100, // cm² to m²
      });
    }
  }

  return rooms;
}

function shoelace(pts: Point[]): number {
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return sum / 2;
}

/**
 * Get polygon vertices for a room from its walls
 */
export function getRoomPolygon(room: Room, walls: Wall[]): Point[] {
  const roomWalls = walls.filter(w => room.walls.includes(w.id));
  if (roomWalls.length < 3) return [];

  // Build ordered vertices
  const verts: Point[] = [];
  const used = new Set<string>();
  
  // Start from first wall
  let current = roomWalls[0];
  verts.push(current.start);
  used.add(current.id);
  let tip = current.end;

  for (let i = 0; i < roomWalls.length - 1; i++) {
    verts.push(tip);
    const next = roomWalls.find(w => !used.has(w.id) && (ptEq(w.start, tip) || ptEq(w.end, tip)));
    if (!next) break;
    used.add(next.id);
    tip = ptEq(next.start, tip) ? next.end : next.start;
    current = next;
  }

  return verts;
}

export function roomCentroid(polygon: Point[]): Point {
  const cx = polygon.reduce((s, p) => s + p.x, 0) / polygon.length;
  const cy = polygon.reduce((s, p) => s + p.y, 0) / polygon.length;
  return { x: cx, y: cy };
}
