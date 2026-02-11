<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { activeFloor } from '$lib/stores/project';
  import type { Floor, Wall, Door, Window as Win } from '$lib/models/types';
  import * as THREE from 'three';
  import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

  let container: HTMLDivElement;
  let renderer: THREE.WebGLRenderer;
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;
  let animId: number;
  let currentFloor: Floor | null = null;
  let wallGroup: THREE.Group;

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 10000);
    camera.position.set(500, 800, 500);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(500, 1000, 500);
    dir.castShadow = true;
    scene.add(dir);

    // Floor plane
    const floorGeo = new THREE.PlaneGeometry(3000, 3000);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d4, side: THREE.DoubleSide });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Grid helper
    const grid = new THREE.GridHelper(3000, 150, 0xcccccc, 0xe0e0e0);
    scene.add(grid);

    wallGroup = new THREE.Group();
    scene.add(wallGroup);
  }

  function buildWalls(floor: Floor) {
    // Clear
    while (wallGroup.children.length) wallGroup.remove(wallGroup.children[0]);

    const SCALE = 1; // 1 unit = 1 cm

    for (const wall of floor.walls) {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;

      const h = wall.height * SCALE;
      const t = wall.thickness * SCALE;

      // Find door/window openings on this wall
      const doorOpenings = floor.doors.filter((d) => d.wallId === wall.id);
      const winOpenings = floor.windows.filter((w) => w.wallId === wall.id);

      // Simple approach: create wall shape and subtract openings using multiple segments
      const segments = buildWallSegments(len, h, t, doorOpenings, winOpenings);

      const angle = Math.atan2(dy, dx);
      const cx = (wall.start.x + wall.end.x) / 2;
      const cy = (wall.start.y + wall.end.y) / 2;

      for (const seg of segments) {
        const geo = new THREE.BoxGeometry(seg.width, seg.height, t);
        const mat = new THREE.MeshStandardMaterial({ color: wall.color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Position: offset from wall center
        const localX = seg.offsetX - len / 2;
        mesh.position.set(
          cx + localX * Math.cos(angle),
          seg.height / 2 + seg.offsetY,
          cy + localX * Math.sin(angle)
        );
        mesh.rotation.y = -angle;
        wallGroup.add(mesh);
      }
    }

    // Door indicators (simple arcs on floor)
    for (const door of floor.doors) {
      const wall = floor.walls.find((w) => w.id === door.wallId);
      if (!wall) continue;
      const t = door.position;
      const px = wall.start.x + (wall.end.x - wall.start.x) * t;
      const py = wall.start.y + (wall.end.y - wall.start.y) * t;
      const doorGeo = new THREE.BoxGeometry(door.width, 5, 5);
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const doorMesh = new THREE.Mesh(doorGeo, doorMat);
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      doorMesh.position.set(px, wall.height / 2, py);
      doorMesh.rotation.y = -angle;
      wallGroup.add(doorMesh);
    }

    // Window indicators
    for (const win of floor.windows) {
      const wall = floor.walls.find((w) => w.id === win.wallId);
      if (!wall) continue;
      const t = win.position;
      const px = wall.start.x + (wall.end.x - wall.start.x) * t;
      const py = wall.start.y + (wall.end.y - wall.start.y) * t;
      const winGeo = new THREE.BoxGeometry(win.width, win.height, 3);
      const winMat = new THREE.MeshStandardMaterial({ color: 0x87CEEB, transparent: true, opacity: 0.5 });
      const winMesh = new THREE.Mesh(winGeo, winMat);
      const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
      winMesh.position.set(px, win.sillHeight + win.height / 2, py);
      winMesh.rotation.y = -angle;
      wallGroup.add(winMesh);
    }
  }

  interface WallSegment {
    width: number;
    height: number;
    offsetX: number; // center X along wall length
    offsetY: number; // bottom Y
  }

  function buildWallSegments(
    wallLen: number, wallH: number, _t: number,
    doors: Door[], windows: Win[]
  ): WallSegment[] {
    // Collect openings sorted by position
    type Opening = { pos: number; width: number; bottomY: number; topY: number };
    const openings: Opening[] = [];
    for (const d of doors) {
      openings.push({ pos: d.position * wallLen, width: d.width, bottomY: 0, topY: 210 });
    }
    for (const w of windows) {
      openings.push({ pos: w.position * wallLen, width: w.width, bottomY: w.sillHeight, topY: w.sillHeight + w.height });
    }

    if (openings.length === 0) {
      return [{ width: wallLen, height: wallH, offsetX: wallLen / 2, offsetY: 0 }];
    }

    openings.sort((a, b) => a.pos - b.pos);

    const segs: WallSegment[] = [];
    let cursor = 0;

    for (const op of openings) {
      const left = op.pos - op.width / 2;
      const right = op.pos + op.width / 2;

      // Segment before opening
      if (left > cursor) {
        segs.push({ width: left - cursor, height: wallH, offsetX: cursor + (left - cursor) / 2, offsetY: 0 });
      }

      // Above opening
      if (op.topY < wallH) {
        segs.push({ width: op.width, height: wallH - op.topY, offsetX: op.pos, offsetY: op.topY });
      }

      // Below opening (for windows)
      if (op.bottomY > 0) {
        segs.push({ width: op.width, height: op.bottomY, offsetX: op.pos, offsetY: 0 });
      }

      cursor = Math.max(cursor, right);
    }

    // Remaining
    if (cursor < wallLen) {
      segs.push({ width: wallLen - cursor, height: wallH, offsetX: cursor + (wallLen - cursor) / 2, offsetY: 0 });
    }

    return segs;
  }

  function animate() {
    animId = requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }

  function onResize() {
    if (!container || !renderer) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  onMount(() => {
    init();
    animate();

    const resizeObs = new ResizeObserver(onResize);
    resizeObs.observe(container);

    const unsub = activeFloor.subscribe((f) => {
      currentFloor = f;
      if (f) buildWalls(f);
    });

    return () => {
      resizeObs.disconnect();
      unsub();
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  });
</script>

<div bind:this={container} class="w-full h-full"></div>
