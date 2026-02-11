export interface FloorMaterial {
  id: string;
  name: string;
  color: string;
  pattern?: 'hardwood' | 'tile' | 'carpet' | 'concrete' | 'marble';
}

export interface WallColor {
  id: string;
  name: string;
  color: string;
}

export const floorMaterials: FloorMaterial[] = [
  { id: 'hardwood', name: 'Hardwood', color: '#c4a882', pattern: 'hardwood' },
  { id: 'tile', name: 'Tile', color: '#d4cfc9', pattern: 'tile' },
  { id: 'carpet', name: 'Carpet', color: '#a8a29e', pattern: 'carpet' },
  { id: 'concrete', name: 'Concrete', color: '#9ca3af', pattern: 'concrete' },
  { id: 'marble', name: 'Marble', color: '#e8e5e0', pattern: 'marble' },
  { id: 'light-wood', name: 'Light Wood', color: '#dpc9a8', pattern: 'hardwood' },
  { id: 'dark-wood', name: 'Dark Wood', color: '#8b6f47', pattern: 'hardwood' },
];

export const wallColors: WallColor[] = [
  { id: 'white', name: 'White', color: '#ffffff' },
  { id: 'cream', name: 'Cream', color: '#fffdd0' },
  { id: 'light-gray', name: 'Light Gray', color: '#d1d5db' },
  { id: 'light-blue', name: 'Light Blue', color: '#dbeafe' },
  { id: 'beige', name: 'Beige', color: '#f5f0e1' },
  { id: 'sage', name: 'Sage', color: '#d4e2d4' },
  { id: 'warm-gray', name: 'Warm Gray', color: '#e7e5e4' },
];

export function getMaterial(id: string): FloorMaterial {
  return floorMaterials.find(m => m.id === id) ?? floorMaterials[0];
}
