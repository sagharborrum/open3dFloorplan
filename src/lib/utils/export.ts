import type { Project } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { detectRooms, getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { projectSettings, formatArea } from '$lib/stores/settings';
import { get } from 'svelte/store';
import jsPDF from 'jspdf';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsPNG(canvas: HTMLCanvasElement) {
  canvas.toBlob((blob) => {
    if (blob) download(blob, 'floorplan-2d.png');
  });
}

export function exportAsJSON(project: Project) {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  download(blob, `${project.name || 'project'}.json`);
}

export function exportAsSVG(project: Project) {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of floor.walls) {
    for (const p of [w.start, w.end]) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  }
  const pad = 50;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;

  let paths = '';

  // Room fills
  const ROOM_COLORS_SVG = ['#bfdbfe', '#fde68a', '#bbf7d0', '#fecaca', '#ddd6fe', '#a5f3fc', '#fed7aa'];
  const rooms = detectRooms(floor.walls);
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri];
    const poly = getRoomPolygon(room, floor.walls);
    if (poly.length < 3) continue;
    const pts = poly.map(p => `${p.x - minX + pad},${p.y - minY + pad}`).join(' ');
    const color = ROOM_COLORS_SVG[ri % ROOM_COLORS_SVG.length];
    paths += `  <polygon points="${pts}" fill="${color}" fill-opacity="0.4" stroke="none"/>\n`;
    const c = roomCentroid(poly);
    const cx = c.x - minX + pad;
    const cy = c.y - minY + pad;
    paths += `  <text x="${cx}" y="${cy}" text-anchor="middle" font-size="12" fill="#444" font-family="sans-serif" font-weight="bold">${room.name}</text>\n`;
    paths += `  <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#888" font-family="sans-serif">${formatArea(room.area, get(projectSettings).units)}</text>\n`;
  }

  for (const w of floor.walls) {
    const x1 = w.start.x - minX + pad;
    const y1 = w.start.y - minY + pad;
    const x2 = w.end.x - minX + pad;
    const y2 = w.end.y - minY + pad;
    paths += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="${w.thickness}" stroke-linecap="round"/>\n`;
    // dimension label
    const len = Math.round(Math.hypot(x2 - x1, y2 - y1));
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    paths += `  <text x="${mx}" y="${my - 8}" text-anchor="middle" font-size="11" fill="#666" font-family="sans-serif">${len} cm</text>\n`;
  }

  // Draw doors as arcs
  for (const d of floor.doors) {
    const wall = floor.walls.find(w => w.id === d.wallId);
    if (!wall) continue;
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    const t = d.position;
    const px = wall.start.x + dx * t - minX + pad;
    const py = wall.start.y + dy * t - minY + pad;
    paths += `  <circle cx="${px}" cy="${py}" r="4" fill="#8B4513"/>\n`;
  }

  // Furniture rectangles (actual dimensions from catalog)
  for (const fi of floor.furniture) {
    const fx = fi.position.x - minX + pad;
    const fy = fi.position.y - minY + pad;
    const cat = getCatalogItem(fi.catalogId);
    const fw = cat ? cat.width : 30;
    const fd = cat ? cat.depth : 30;
    const color = cat ? `#${cat.color.toString(16).padStart(6, '0')}` : '#a0c4e8';
    const rot = fi.rotation || 0;
    paths += `  <g transform="translate(${fx},${fy}) rotate(${rot})">\n`;
    paths += `    <rect x="${-fw / 2}" y="${-fd / 2}" width="${fw}" height="${fd}" fill="${color}" stroke="#555" stroke-width="0.5" rx="2" opacity="0.7"/>\n`;
    if (cat) {
      paths += `    <text x="0" y="4" text-anchor="middle" font-size="9" fill="#333" font-family="sans-serif">${cat.name}</text>\n`;
    }
    paths += `  </g>\n`;
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}">
  <rect width="100%" height="100%" fill="white"/>
${paths}</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  download(blob, `${project.name || 'floorplan'}.svg`);
}

export function exportAs3DPNG(renderer: THREE.WebGLRenderer) {
  renderer.domElement.toBlob((blob) => {
    if (blob) download(blob, 'floorplan-3d.png');
  });
}

export function exportPDF(project: Project) {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  // Create PDF in A4 landscape orientation
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Get the 2D canvas (floor plan canvas)
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  if (!canvas) {
    alert('Canvas not found. Please make sure the 2D view is visible.');
    return;
  }

  // Convert canvas to image data
  const imgData = canvas.toDataURL('image/png');
  
  // Calculate dimensions to fit the image on the page with margins
  const margin = 20;
  const maxWidth = pageWidth - (margin * 2);
  const maxHeight = pageHeight - (margin * 3) - 30; // Extra space for title and footer
  
  // Calculate aspect ratio and fitting dimensions
  const aspectRatio = canvas.width / canvas.height;
  let imgWidth = maxWidth;
  let imgHeight = maxWidth / aspectRatio;
  
  if (imgHeight > maxHeight) {
    imgHeight = maxHeight;
    imgWidth = maxHeight * aspectRatio;
  }
  
  // Center the image
  const imgX = (pageWidth - imgWidth) / 2;
  const imgY = margin + 20; // Space for title
  
  // Add title
  pdf.setFontSize(18);
  pdf.setFont(undefined, 'bold');
  const title = `Floor Plan — ${floor.name}`;
  const titleWidth = pdf.getTextWidth(title);
  pdf.text(title, (pageWidth - titleWidth) / 2, margin + 10);
  
  // Add the floor plan image
  pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth, imgHeight);
  
  // Add scale indicator (approximate)
  pdf.setFontSize(10);
  pdf.setFont(undefined, 'normal');
  const scaleText = 'Scale: 1:1 (approximate)';
  pdf.text(scaleText, margin, imgY + imgHeight + 10);
  
  // Add date in footer
  const today = new Date().toLocaleDateString();
  const footerText = `Generated on ${today}`;
  const footerWidth = pdf.getTextWidth(footerText);
  pdf.text(footerText, pageWidth - margin - footerWidth, pageHeight - 10);
  
  // Save the PDF
  const filename = `${project.name || 'floorplan'}.pdf`;
  pdf.save(filename);
}
