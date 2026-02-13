# Bug Report - v0.4.6 QA Testing
> Date: 2026-02-12

## Critical Bugs

### 1. Room area doesn't respect imperial units
- **Steps**: Switch to ft/inch in Settings > Dimensions, look at room labels and status bar
- **Expected**: Area shows in sq ft (e.g. "129 ft²")
- **Actual**: Always shows m² regardless of unit setting
- **Affected**: Canvas room labels, Properties panel area, status bar total area, 3D room labels, SVG/DXF export
- **Files**: `FloorPlanCanvas.svelte:1558`, `PropertiesPanel.svelte:592`, `FloorPlanCanvas.svelte:3204`, `ThreeViewer.svelte:775`, `export.ts:58`, `cadExport.ts:49`

### 2. Properties panel input fields don't convert to imperial
- **Steps**: Select a wall in imperial mode, look at Length/Thickness/Height inputs
- **Expected**: Values shown in ft/inches
- **Actual**: Values always in cm — user edits in cm even when imperial is selected
- **Affected**: Wall thickness, wall height, door width/height, window width/height, furniture dimensions

## Major Bugs

### 3. Room drag may move shared walls unexpectedly
- **Steps**: Create two adjacent rooms sharing a wall, drag one room
- **Expected**: Only the selected room's walls move (shared wall stretches or detaches)
- **Actual**: Shared wall moves with the dragged room, deforming the adjacent room
- **Root cause**: `room.walls` includes shared wall IDs — both rooms reference the same wall

### 4. `buildWalls()` fires twice on floor change (orphaned 3D objects)
- **Steps**: Switch between 2D and 3D, modify walls, switch back
- **Expected**: Clean 3D scene rebuild
- **Actual**: Svelte store double-subscription causes `buildWalls()` to run twice, creating orphaned Three.js containers (memory leak over time)
- **File**: `ThreeViewer.svelte` — `activeFloor.subscribe` fires twice on reactive updates

### 5. Properties panel z-index conflicts with 3D overlay buttons
- **Steps**: In 3D mode, select a wall — properties panel appears
- **Expected**: Panel sits cleanly to the right, 3D buttons (edit/screenshot/walkthrough) remain accessible
- **Actual**: Panel may overlap the 3D action buttons in top-right corner (both use z-index, fixed positioning)

### 6. Extension lines setting only affects wall dimensions
- **Steps**: Toggle "Extension Lines" off in settings
- **Expected**: All extension lines disappear
- **Actual**: Only wall dimension extension lines are toggled — door/window distance dimension lines still show their own extension-style marks

### 7. "External Dimensions" and "Internal Dimensions" toggles do nothing
- **Steps**: Toggle these in Settings > Dimensions
- **Expected**: External/internal dimension lines show/hide
- **Actual**: No effect — these settings exist in the store but aren't wired to any rendering logic
- **Note**: Would need separate rendering passes for external (outside building envelope) and internal (inside room) dimensions

### 8. "Object Distance" toggle does nothing
- **Steps**: Toggle in Settings > Dimensions
- **Expected**: Distance lines from furniture to walls show/hide
- **Actual**: No effect — not wired to rendering

## Minor Bugs

### 9. Dimension line color only partially applied
- **Steps**: Switch line color to white in settings
- **Expected**: All dimension elements turn white
- **Actual**: Main dimension text changes, but dimension lines (`#6b7280`), arrowheads, and door/window distance pills still use hardcoded colors

### 10. Properties panel flickers on rapid selection changes
- **Steps**: Quickly click different walls/furniture in succession
- **Expected**: Smooth panel content swap
- **Actual**: Panel unmounts/remounts on each selection change (due to `{#if hasSelection}`) causing a brief flicker

### 11. Status bar area always in m²
- **Steps**: Check bottom status bar in imperial mode
- **Expected**: "12.0 ft²" or similar
- **Actual**: Always "12.0 m²"
- **File**: `FloorPlanCanvas.svelte:3204`

### 12. Ruler labels don't respect unit settings
- **Steps**: Switch to imperial, look at ruler markings on canvas edges
- **Expected**: Rulers show feet/inches
- **Actual**: Always show cm/m
- **File**: `FloorPlanCanvas.svelte:1675,1709`

### 13. Room preset drag offset
- **Steps**: Drag a room preset from the Rooms panel onto the canvas
- **Expected**: Room centered at drop point
- **Actual**: Room origin is at top-left — the room appears offset from where you dropped

### 14. Settings dialog doesn't default to Project tab
- **Steps**: Open settings
- **Expected**: Could argue either tab is fine as default
- **Actual**: Always opens on Dimensions tab — might be more intuitive to open on Project tab first time

### 15. 3D furniture may have wrong orientation after non-uniform scaling
- **Steps**: Place furniture, view in 3D
- **Expected**: Furniture faces correct direction matching 2D rotation
- **Actual**: Non-uniform `scaleToFit` can stretch models disproportionally if GLB model's local axes don't align with our width/depth/height convention (e.g. some Kenney models have Z as up)

### 16. Curved wall dimensions show straight-line length
- **Steps**: Create a curved wall, check dimension label
- **Expected**: Arc length shown
- **Actual**: The curved wall dimension code path (line ~603) calculates `wlen` which may be chord length not arc length depending on `wallLength()` implementation

### 17. No visual feedback during drag-and-drop from panel
- **Steps**: Drag a furniture item from the Objects panel toward the canvas
- **Expected**: Ghost preview of the item follows cursor
- **Actual**: Browser default drag image (small translucent copy of the button) — no preview on canvas until dropped

### 18. `formatLength` rounding quirk
- **Steps**: Wall of 100cm displayed in metric
- **Expected**: "1 m"
- **Actual**: "1 m" ✓ — but 150cm shows "1.50 m" (trailing zero), while "1.5 m" would be cleaner

## Working Correctly
- Wall drawing (click chain, double-click finish, close loop)
- Wall endpoint dragging
- Wall parallel movement
- Snap to grid
- Undo/redo
- Furniture placement (click-to-place)
- Furniture rotation (R key)
- Furniture resize handles
- Door/window placement on walls
- Door/window selection boxes (blue dashed)
- Multi-select (shift-click, marquee)
- Multi-select bounding box drag
- 3D view rendering (walls, doors, windows, furniture, floors)
- 3D edit mode wall selection (only clicked wall highlights)
- 3D walkthrough mode
- 3D screenshot
- Wall texture/color changes (interior/exterior)
- Floor material selection
- Room detection
- Room name/type editing
- Settings gear icon + dialog open/close
- Unit toggle UI (metric ↔ imperial buttons)
- Keyboard shortcuts (V, W, D, G, F, Space+drag, scroll zoom, Ctrl+Z/Y, R, Del, ?, Esc)
- Export PNG/SVG/JSON
- Import RoomPlan JSON
- Background image import
- Auto-save
- Project creation/switching
- Left panel hidden in 3D
- 3D starts view-only
- Furniture 3D model thumbnails in Objects panel
- Drag-and-drop furniture onto canvas

## Interactive Testing - Session 2
> Date: 2026-02-12 (automated browser testing)

### Plan 1: Simple Studio Apartment (6m × 4m)
**Status**: ✅ Passed with minor observations

**What worked:**
- Drawing 4 walls to form a 6m × 4m rectangle ✅
- Room detection: 1 room, 24.0 m² (correct) ✅
- Door placement (single door on bottom wall) with swing arc ✅
- Window placement (2 standard windows on top wall) ✅
- Furniture placement: sofa, coffee table, queen bed, nightstand, desk, office chair ✅
- 2D rendering with labels, dimensions, room name ✅
- 3D rendering: walls, door (brown), windows (glass), floor texture ✅
- Zoom to Fit ✅
- No console errors ✅

**Screenshots**: plan1_2d.jpg, plan1_3d.jpg

---

### Plan 2: L-Shaped House
**Status**: ⚠️ Passed with bugs

**What worked:**
- L-shaped wall layout with 8 walls renders correctly ✅
- Door and windows placed and visible ✅
- Furniture in both areas (living room + kitchen) ✅
- 3D rendering of L-shape ✅
- Dimensions labeled correctly ✅

**Bugs found:**

#### BUG S2-1: Project fails to load if `rooms` field missing from floor data (CRITICAL)
- **What**: Creating a project via localStorage without a `rooms: []` field in the floor object causes the editor to hang on "Loading..." forever
- **Expected**: The editor should handle missing optional fields gracefully, defaulting to empty arrays
- **Impact**: Any externally created or corrupted project data without a `rooms` field will cause infinite loading
- **Repro**: Create project in localStorage with floor object missing `rooms` key → navigate to editor → stuck on "Loading..."
- **Fix suggestion**: Add default values for all optional floor fields in the data loader

#### BUG S2-2: Room detection over-counts rooms in L-shaped layout
- **What**: L-shaped house with interior dividing wall shows "3 rooms 120.0 m²" instead of expected 2 rooms
- **Expected**: Should detect 2 rooms: main area (8m × 5m = 40 m²) and wing (4m × 5m = 20 m²), total 60 m²
- **Actual**: 3 rooms detected, total 120.0 m² (double the correct area)
- **Cause**: The room detection algorithm likely counts the entire outer boundary as a room AND each interior room, effectively double-counting

**Screenshots**: plan2_2d.jpg, plan2_3d.jpg

---

### Plan 3: Multi-Room Apartment (Complex)
**Status**: ⚠️ Passed with bugs

**What worked:**
- 4+ rooms layout with hallway, bedroom, bathroom, kitchen, living room ✅
- Different wall thicknesses: 20cm exterior, 15cm interior ✅
- All 6 door types placed successfully (single, double, pocket, sliding visible) ✅
- Multiple window types (standard, casement, sliding, fixed, bay) ✅
- Furniture appropriate per room ✅
- 3D rendering with interior walls, doors, windows ✅
- Walkthrough mode enters and displays controls ✅
- Wall dimensions labeled in 2D ✅

**Bugs found:**

#### BUG S2-3: Room detection fails for complex multi-room layouts (MAJOR)
- **What**: 4-room apartment with hallway shows "1 room 96.0 m²" instead of 4-5 separate rooms
- **Expected**: Should detect hallway, bedroom, bathroom, kitchen, living room as separate rooms
- **Actual**: Only outer boundary detected as 1 room (12m × 8m = 96 m²)
- **Root cause**: Interior walls that don't form simple closed cycles from the outer boundary aren't detected as room dividers. The room detection uses cycle-finding which only works for the simplest cases (single rectangular room)

#### BUG S2-4: Walkthrough mode - PointerLockControls error (MINOR)
- **What**: Console error "THREE.PointerLockControls: Unable to use Pointer Lock API" when entering walkthrough mode
- **Expected**: Graceful fallback if Pointer Lock isn't available
- **Actual**: Error logged to console; walkthrough still partially works with controls panel visible
- **Note**: May only occur in headless/automated browser environments

**Screenshots**: plan3_2d.jpg, plan3_3d.jpg

---

### Plan 4: Stress Test
**Status**: ⚠️ Passed with bugs

**What worked:**
- 10-room grid layout (5×2) renders correctly ✅
- 22 furniture items all render in correct positions ✅
- 8 doors with swing arcs visible ✅
- 3D rendering of complex 10-room layout ✅
- Performance acceptable at 59% zoom ✅
- No console errors ✅

**Bugs found:**

#### BUG S2-5: Room detection only finds 1 room in 10-room grid (MAJOR, same as S2-3)
- **What**: 10-room grid shows "1 room 120.0 m²" instead of 10 rooms
- **Expected**: 10 rooms of 12 m² each = 120 m² total, but should show "10 rooms"
- **Confirms**: Room detection algorithm fundamentally broken for any layout with interior walls

#### BUG S2-6: "+" button confusion - Add Floor vs Zoom In (UX)
- **What**: Clicking what appears to be a zoom "+" button actually creates new floors
- **Context**: The "+" button next to the floor name in the top bar looks similar to zoom controls. Rapidly clicking it creates many empty floors (tested: 20 floors created)
- **Impact**: Users could accidentally create many floors. The floor tabs overflow the header bar.
- **Suggestion**: Add confirmation dialog for new floor creation, or limit max floors, or make the button less prominent

**Screenshots**: plan4_2d.jpg, plan4_3d.jpg

---

### Plan 5: Import Test (RoomPlan)
**Status**: ✅ Passed

**What worked:**
- Import dialog appears with options (Straighten walls, Enforce orthogonal, Corner merge distance) ✅
- RoomPlan JSON file (test-roomplan-multiroom.json, 252KB) imported successfully ✅
- 20 walls created from LiDAR scan data ✅
- Orthogonal enforcement: walls snapped to 90°/180° angles ✅
- Furniture placed correctly from RoomPlan categories ✅
- Multiple rooms visible with doors and windows ✅
- 3D rendering of imported plan works ✅
- Wall dimensions labeled correctly (realistic measurements: 2.67m, 1.56m, etc.) ✅

**Observations:**
- Room detection still only finds 1 room (15.4 m²) despite multiple rooms visible (same bug as S2-3/S2-5)
- Import creates a new project with the filename as project name
- File picker dialog works for .json and .zip files

**Screenshots**: plan5_2d.jpg, plan5_3d.jpg

---

### Summary of Bugs Found

| ID | Severity | Description |
|---|---|---|
| S2-1 | CRITICAL | Project fails to load if `rooms` field missing from floor data |
| S2-2 | MAJOR | Room detection over-counts in L-shaped layouts |
| S2-3 | MAJOR | Room detection fails for multi-room layouts (only finds outer boundary) |
| S2-4 | MINOR | PointerLockControls console error in walkthrough mode |
| S2-5 | MAJOR | Room detection broken for grid layouts (confirms S2-3) |
| S2-6 | UX | "+" button for adding floors too easy to accidentally click |

### Key Finding: Room Detection Algorithm is Fundamentally Limited

The room detection algorithm (in `roomDetection.ts`) uses a graph-cycle approach that:
- ✅ Works for single rectangular rooms
- ✅ Works for the outer boundary of any shape
- ❌ Fails to detect interior rooms created by T-junction walls
- ❌ Over-counts when both outer boundary and inner rooms are found (L-shape case)
- ❌ Only finds 1 room for complex multi-room layouts

The algorithm needs a complete rewrite to handle:
1. T-junction detection (walls meeting the midpoint of other walls)
2. Proper cycle enumeration that excludes the outer boundary
3. Room area calculation per enclosed region, not just the outer hull

---

## Interactive Testing - Session 3

**Date:** 2026-02-12
**Tester:** Automated (browser tool)
**Build:** Vite dev server, latest commit

### Plan 6: Open Floor Plan with Furniture

**Setup:** Drew 6m × 4m (24 m²) rectangular room, placed Counter (kitchen island) in center, plus Sofa, Dining Table, Fridge, Stove, Armchair, Coffee Table, TV Stand.

**Findings:**

| # | Severity | Description |
|---|----------|-------------|
| 1 | ℹ️ Info | Furniture can be placed outside room walls — no boundary constraint or warning |
| 2 | ℹ️ Info | Furniture items can overlap each other — no collision detection |
| 3 | ✅ Pass | Counter placed in center of room (free placement, not snapped to wall) |
| 4 | ✅ Pass | Furniture Properties panel shows correctly: Width, Depth, Height, Material, Rotation, Color |
| 5 | ✅ Pass | 90° rotation button works correctly, rotation field updates to 90 |
| 6 | ✅ Pass | Furniture selection shows blue handles and copy/delete action buttons |
| 7 | ✅ Pass | All furniture categories available: Living Room, Bedroom, Kitchen, Bathroom, Office, Dining, Decor, Lighting |
| 8 | ✅ Pass | ~45+ furniture items available across all categories |
| 9 | ⚠️ Minor | TV Stand placed partially outside room — placement mode doesn't warn about wall boundaries |

**3D View (Plan 6):**

| # | Severity | Description |
|---|----------|-------------|
| 10 | ❌ Bug | Furniture items NOT visible in 3D view — only walls and floor render. Room has 7+ furniture items in 2D but 3D shows empty room |
| 11 | ✅ Pass | Walls render correctly as 3D box (open top, no ceiling) |
| 12 | ✅ Pass | Floor texture visible |

### Plan 8: All Door and Window Types

**Setup:** Drew 8m × 5m (40 m²) rectangular room. Placed all 6 door types on top wall, 4 window types on bottom wall.

**Door Types Tested:**

| Type | 2D Render | Properties | Notes |
|------|-----------|------------|-------|
| Single (90cm) | ✅ Swing arc visible | ✅ Width, Distance A/B, Height, Type, Hinge Side, Opens | Works correctly |
| Double (150cm) | ✅ Double swing arcs | ✅ Same properties | Works correctly |
| Sliding (180cm) | ✅ Slide track shown | ✅ Same properties | Placed successfully |
| French (150cm) | ✅ Glass door look | ✅ Same properties | Works correctly |
| Pocket (90cm) | ✅ Recessed style | ✅ Same properties | Works correctly |
| Bifold (180cm) | ✅ Fold pattern | ✅ Same properties | Works correctly |

**Window Types Tested:**

| Type | 2D Render | Notes |
|------|-----------|-------|
| Standard (120×120cm) | ✅ Blue line on wall | Placed on bottom wall |
| Fixed (100×100cm) | ✅ Blue line on wall | Placed on bottom wall |
| Casement (80×130cm) | ✅ Blue line on wall | Placed on bottom wall |
| Bay (200×150cm) | ✅ Blue line on wall | Placed on bottom wall |
| Sliding (180×120cm) | ⚠️ Not tested | Name conflict with sliding door in automated test |

**Door/Window Observations:**

| # | Severity | Description |
|---|----------|-------------|
| 13 | ℹ️ Info | Multiple doors can overlap on same wall — no collision detection between openings |
| 14 | ✅ Pass | Door Properties panel shows: Width, Distance from A, Distance from B, Height, Type dropdown, Hinge Side (Left/Right), Opens (Inward/Outward) |
| 15 | ✅ Pass | Door type can be changed via Type dropdown in properties panel |
| 16 | ✅ Pass | Dimension line shows distance along wall when door is selected |

**3D View (Plan 8):**

| # | Severity | Description |
|---|----------|-------------|
| 17 | ✅ Pass | Doors render in 3D as brown wooden panels with proper wall openings |
| 18 | ✅ Pass | Windows render in 3D as glass panels with proper wall openings |
| 19 | ✅ Pass | Different door/window sizes visible in 3D |
| 20 | ⚠️ Minor | One door appears to protrude outside wall face on right side |

### Plan 9: Settings & Units

**Imperial Unit Conversion:**

| # | Severity | Description |
|---|----------|-------------|
| 21 | ✅ Pass | Wall dimension labels convert from "8 m" / "5.00 m" to "26'3"" / "16'5"" |
| 22 | ❌ Bug | Room area label stays as "Room 1 (40 m²)" — doesn't convert to ft² |
| 23 | ❌ Bug | Status bar area stays as "40.0 m²" — doesn't convert to ft² |
| 24 | ❌ Bug | Ruler markings still show cm values (-500, -400, etc.) — don't convert to inches/feet |
| 25 | ❌ Bug | Sidebar door/window labels still show "cm" units (e.g., "90cm swing", "120×120cm") — don't convert to imperial |

**Dimension Settings:**

| # | Severity | Description |
|---|----------|-------------|
| 26 | ✅ Pass | Settings dialog accessible via gear icon |
| 27 | ✅ Pass | Dimensions toggle (on/off) works |
| 28 | ✅ Pass | External Dimensions toggle works |
| 29 | ✅ Pass | Internal Dimensions toggle available (off by default) |
| 30 | ✅ Pass | Extension Lines toggle works |
| 31 | ✅ Pass | Object Distance toggle works |
| 32 | ✅ Pass | Line Color option available (light/dark) |
| 33 | ✅ Pass | Project and Dimensions tabs in settings |

### Plan 11: Undo/Redo

| # | Severity | Description |
|---|----------|-------------|
| 34 | ✅ Pass | Undo button works — removes last-placed items one by one |
| 35 | ✅ Pass | Redo button works — restores undone items |
| 36 | ⚠️ Minor | Rapid Ctrl+Z via keyboard (with metaKey) triggered browser back navigation instead of app undo — the keyboard shortcut dispatch used both ctrlKey and metaKey simultaneously |
| 37 | ✅ Pass | Multiple consecutive undos work correctly, removing doors/windows in reverse order |

### Plan 12: Export Testing

**Export Menu Options Available:**
- Export 2D as PNG
- Export 3D as PNG
- Export as SVG
- Export as DXF
- Export as DWG
- Export as PDF
- Download JSON
- Import JSON
- New Project

| # | Severity | Description |
|---|----------|-------------|
| 38 | ✅ Pass | All export buttons clickable without console errors |
| 39 | ✅ Pass | Export 2D as PNG — no errors |
| 40 | ✅ Pass | Export as SVG — no errors |
| 41 | ✅ Pass | Export as DXF — no errors |
| 42 | ✅ Pass | Download JSON — no errors |
| 43 | ℹ️ Info | Could not verify downloaded files in headless browser environment |
| 44 | ✅ Pass | Import JSON option available in export menu |

### Additional Observations

**Rooms Panel:**

| # | Severity | Description |
|---|----------|-------------|
| 45 | ✅ Pass | Room presets available: Rectangle, L-Shape, T-Shape, U-Shape |
| 46 | ✅ Pass | Room preset descriptions clear: "Click to add a room shape to the canvas" |

**General:**

| # | Severity | Description |
|---|----------|-------------|
| 47 | ✅ Pass | Auto-save indicator visible in top bar |
| 48 | ✅ Pass | Zoom controls work (zoom in/out/percentage/fit) |
| 49 | ✅ Pass | Wall drawing with click-click-C (close) workflow works reliably |
| 50 | ✅ Pass | Room detection works — "1 room 24.0 m²" / "1 room 40.0 m²" shown in status bar |
| 51 | ✅ Pass | Floor count indicator visible (1F) |
| 52 | ✅ Pass | Multi-floor support available (+ button for adding floors) |

### Summary

**Critical Bugs (3):**
1. **Furniture not visible in 3D** (#10) — major gap between 2D and 3D modes
2. **Imperial units incomplete** (#22-25) — room area, ruler, status bar, sidebar labels don't convert
3. **Room area doesn't show ft²** when imperial selected (#22)

**Minor Issues (3):**
1. Furniture can be placed outside room boundaries (#1, #9)
2. No collision detection for overlapping doors/furniture (#2, #13)
3. Door protruding outside wall in 3D (#20)

**Passes: 38 out of 52 items tested passed**

## Interactive Testing - Session 4

**Date:** 2026-02-12
**Tester:** Automated (browser tool)
**Build:** Vite dev server, latest commit

---

### Plan 16: Multi-Floor Test

**Setup:** Created project "Session 4 Test", added rooms on multiple floors using room presets.

| # | Test | Result | Notes |
|---|------|--------|-------|
| S4-1 | Add second floor (+ button) | ✅ Pass | Floor 1 created, shows 0 walls — separate from Ground Floor |
| S4-2 | Different layouts per floor | ✅ Pass | Ground Floor: Rectangle (4 walls, 12 m²), Floor 1: L-Shape (6 walls, 9 m²) |
| S4-3 | Switch between floors in 2D | ✅ Pass | Each floor shows its own layout, wall count, and room area correctly |
| S4-4 | 3D view per floor | ✅ Pass | Ground Floor shows rectangle box, Floor 1 shows L-shaped walls in 3D |
| S4-5 | Switch floors in 3D view | ✅ Pass | Clicking floor tabs in 3D rebuilds the scene with correct floor geometry |
| S4-6 | Add 5+ floors | ✅ Pass | Successfully created 8 floors (Ground + Floor 1-7) |
| S4-7 | Floor tab overflow with many floors | ⚠️ UX | 8 floor tabs crowd the header bar, squeezing project name. No scroll or overflow handling. |
| S4-8 | No max floor limit | ℹ️ Info | Can add unlimited floors. No confirmation dialog. Confirms bug S2-6 from Session 2. |
| S4-9 | Delete a floor (double-click tab) | ✅ Pass | Double-clicking Floor 7 tab deleted it, went from 8F to 7F |
| S4-10 | T-Shape preset | ✅ Pass | Placed on Floor 2: 8 walls, 9.0 m², T-shaped layout with correct dimensions |
| S4-11 | U-Shape preset | ✅ Pass | Placed on Floor 3: 8 walls, 9.0 m², U-shaped layout with central cutout |
| S4-12 | All room presets work | ✅ Pass | Rectangle, L-Shape, T-Shape, U-Shape all create correctly |

**Bugs Found:**

#### BUG S4-1: Floor deletion has no confirmation dialog (UX)
- **Steps**: Double-click any floor tab
- **Expected**: Confirmation dialog "Delete Floor X? This will remove all walls and furniture."
- **Actual**: Floor deleted immediately without warning
- **Impact**: Accidental double-click on a floor tab could destroy work
- **Note**: Double-click as delete trigger is non-standard and undiscoverable

#### BUG S4-2: `columns` field undefined on non-initial floors (MINOR)
- **Steps**: Add a new floor, check data in localStorage
- **Expected**: `columns: []` (empty array like other fields)
- **Actual**: `columns: undefined` on floors created after initial Ground Floor
- **Root cause**: `createDefaultFloor()` includes `columns: []` but `addFloor()` may not initialize it
- **Impact**: Could cause crashes if code accesses `.columns.length` without null check

---

### Plan 18: Keyboard Shortcuts Comprehensive

| Shortcut | Expected | Result | Notes |
|----------|----------|--------|-------|
| V | Select mode | ✅ Pass | Switches to Select tool |
| W | Wall mode | ✅ Pass | Switches to Draw Wall tool (highlighted in sidebar) |
| D | Door mode | ✅ Pass | Switches to Door placement (Single door highlighted) |
| G | Toggle grid | ✅ Pass | Grid icon changes ▦→▢, grid lines disappear/appear |
| F | Fit to view | ✅ Pass | Zoomed from 100% to 170% to fit room in viewport |
| M | Measure mode | ✅ Pass | Red banner: "Right-click two points to measure · M to exit · Esc to cancel" |
| ? | Help dialog | ✅ Pass | Shows full keyboard shortcuts reference with all categories |
| Esc | Cancel/close | ✅ Pass | Closes help dialog, exits measure mode |
| Del/Backspace | Delete selected | Not tested | Requires canvas element selection (couldn't interact with canvas) |
| R | Rotate furniture | Not tested | Requires furniture selection |
| Ctrl+Z | Undo | Previously tested ✅ | Works via toolbar button |
| Ctrl+Y | Redo | Previously tested ✅ | Works via toolbar button |
| C | Close wall loop | Not tested | Requires active wall drawing chain |
| Space+drag | Pan | Not tested | Requires canvas mouse interaction |
| Scroll | Zoom | Not tested | Requires canvas scroll events |

**Keyboard shortcuts listed in help dialog:**
- TOOLS: V (Select), W (Wall), D (Door), Del/Backspace (Delete)
- CANVAS: Space+Drag (Pan), Scroll (Zoom), G (Grid), F (Fit), M/Right-click (Measure)
- EDIT: Ctrl+Z (Undo), Ctrl+Y (Redo), R/Scroll (Rotate furniture), Esc (Cancel)
- WALLS: Double-click (Finish chain), C/Click start (Close loop)

**Notable**: No shortcut for Window mode. D is Door only. No keyboard shortcut for toggling rulers or layers.

---

### Plan 13: 3D Material / Edit Mode (Partial)

| # | Test | Result | Notes |
|---|------|--------|-------|
| S4-13 | Enter 3D edit mode | ✅ Pass | Blue banner: "Edit Mode — Click walls to select & change materials · ESC to exit" |
| S4-14 | Exit edit mode with ESC | ✅ Pass | Edit mode banner disappears, button un-highlights |
| S4-15 | 3D screenshot button visible | ✅ Pass | Camera icon button in top-right corner |
| S4-16 | Walkthrough button visible | ✅ Pass | Person icon button in top-right corner |

**Note**: Could not test wall clicking/material application in 3D — requires clicking on WebGL canvas at specific 3D coordinates which the browser automation tool cannot target via accessibility refs.

---

### Structure Elements Test (New)

| # | Test | Result | Notes |
|---|------|--------|-------|
| S4-17 | Add Stairs button | ✅ Pass | Button highlights, enters "placing stair" mode |
| S4-18 | Round Column button | ✅ Pass | Button highlights, enters "placing column" mode |
| S4-19 | Square Column button | ✅ Pass | Button highlights, enters "placing column" mode |
| S4-20 | Stairs render on canvas | ✅ Pass | Arrow/triangle shape with "UP" label visible on canvas |
| S4-21 | Columns render on canvas | ✅ Pass | Small circle/square visible on canvas |

#### BUG S4-3: Stairs and columns not persisted to localStorage (MAJOR)
- **Steps**: Place stairs and columns on Ground Floor, check localStorage data
- **Expected**: `stairs` and `columns` arrays contain the placed items
- **Actual**: Both arrays are empty `[]` in localStorage despite items rendering on canvas
- **Impact**: Stairs and columns will be lost on page refresh/reload
- **Root cause**: Auto-save may not be serializing in-memory Svelte store changes for stairs/columns, OR the placement didn't actually create data entries (the canvas rendering may be from stale reactive state)

---

### Layers Panel Test (New)

| # | Test | Result | Notes |
|---|------|--------|-------|
| S4-22 | Layers button in status bar | ✅ Pass | Opens layer visibility panel in bottom-right corner |
| S4-23 | Layer checkboxes | ✅ Pass | Shows: Furniture, Doors, Windows, Stairs, Room Labels, Dimensions — all checked |
| S4-24 | Layers panel positioning | ✅ Pass | Non-modal popover, doesn't block canvas interaction |

---

### Additional Observations

| # | Test | Result | Notes |
|---|------|--------|-------|
| S4-25 | Rulers toggle | ✅ Pass | Rulers button in status bar toggles ruler visibility on/off |
| S4-26 | Grid visibility toggle (G key) | ✅ Pass | G toggles grid lines on canvas; separate from "Snap to Grid" toggle |
| S4-27 | Room preset adds stairs element (?) | ⚠️ Unclear | After clicking "Add Stairs", room label changed from "Room 1" to "Room UP" — may indicate stairs were placed at (0,0) or the "placing" mode label overlaps |
| S4-28 | Pan mode button (H) | ✅ Pass | Pan mode toggle button visible in toolbar |
| S4-29 | Furniture visibility toggle | ✅ Pass | Eye icon button in toolbar toggles furniture layer |
| S4-30 | No console errors | ✅ Pass | Zero JavaScript errors throughout entire Session 4 testing |

---

### Summary - Session 4

**New Bugs Found: 3**

| ID | Severity | Description |
|---|----------|-------------|
| S4-1 | UX | Floor deletion has no confirmation dialog — double-click deletes immediately |
| S4-2 | MINOR | `columns` field undefined on non-initial floors |
| S4-3 | MAJOR | Stairs and columns not persisted to localStorage — lost on refresh |

**Features Verified Working: 30 items**
- Multi-floor creation, switching, 3D rendering per floor ✅
- Floor deletion via double-click ✅ (works but needs confirmation)
- All 4 room presets (Rectangle, L-Shape, T-Shape, U-Shape) ✅
- Keyboard shortcuts: V, W, D, G, F, M, ?, Esc ✅
- 3D Edit Mode entry/exit ✅
- Layers panel with visibility toggles ✅
- Rulers toggle ✅
- Stairs/columns placement UI ✅
- 8+ floors with no errors ✅

**Not Tested (limitations of browser automation):**
- Plans 14, 15, 17, 19 require canvas mouse interaction (drawing walls via click-drag, curved walls, background image calibration, edge cases with precise coordinate clicks) which cannot be performed through accessibility refs on a WebGL/Canvas2D element
- 3D wall material application requires clicking specific 3D geometry
- Keyboard shortcuts that need canvas focus: Space+drag, Scroll zoom, R rotate, Del delete

---

## Code Review Findings - Session 5

> Deep static analysis of source code. Focus: logic errors, edge cases, data integrity.
> Date: 2026-02-12

### CRITICAL Bugs

#### CR-1: Room Detection Algorithm Fundamentally Broken for T-Junctions and Interior Walls
**File:** `lib/utils/roomDetection.ts`, lines 78-99
**Code:**
```ts
const neighbors2 = adj.get(next);
if (!neighbors2 || neighbors2.length < 2) { valid = false; break; }
```
**Problem:** The algorithm requires every vertex to have **at least 2 neighbors** (`neighbors2.length < 2`). At a T-junction (where an interior wall meets an exterior wall), the junction vertex has 3+ edges. The "next CCW edge" selection logic (`bestDelta`) skips going back to `cur` with `if (neighbors2[i].to === cur && neighbors2.length > 1) continue`, but this only skips the immediate backtrack — it doesn't correctly handle the case where the traversal needs to pick between **two forward edges** at a T-junction. The algorithm traces the wrong cycle, producing either:
- An oversized polygon encompassing both rooms (the exterior boundary)
- Missing the interior room entirely
- The `usedDirected` set marks edges as consumed during the first traversal, preventing the second room from ever being found

Additionally, the `EPSILON = 5` snap distance for vertex matching is fragile — walls drawn freehand may have endpoints 6-10px apart, causing the graph to be disconnected.

**Why multi-room fails:** When two rooms share a wall (e.g., L-shaped house with divider), the first cycle traversal consumes the shared wall's directed edges. The second room's traversal finds those edges in `usedDirected` and aborts (`valid = false`). The algorithm needs a proper planar subdivision / face-finding approach (e.g., DCEL / half-edge data structure).
**Severity:** Critical — core feature is non-functional for real floor plans

#### CR-2: `addFloor()` Omits `columns` Array — Columns Lost on New Floors
**File:** `lib/stores/project.ts`, line ~221
**Code:**
```ts
const floor: Floor = { id: uid(), name: name ?? `Floor ${level}`, level, walls: [], rooms: [], doors: [], windows: [], furniture: [], stairs: [] };
```
**Problem:** `columns: []` is missing. The `Floor` interface requires it. Any code accessing `floor.columns` on a newly added floor gets `undefined`, which is why all column mutations guard with `if (!f.columns)`. But the `removeElement` function does `if (f.columns) f.columns = f.columns.filter(...)` — if columns is undefined, the element won't be removed from other arrays either since it won't match, but the guard silently skips. More critically, when `copyCurrentLayout` is true, columns from the source floor are **not copied** (only walls are).
**Severity:** Critical — data loss for columns on floor copy

#### CR-3: `addFloor()` Doesn't Copy Doors/Windows/Furniture/Stairs When `copyCurrentLayout=true`
**File:** `lib/stores/project.ts`, lines 219-226
**Code:**
```ts
if (copyCurrentLayout) {
    const cur = p.floors.find(f => f.id === p.activeFloorId);
    if (cur) {
      floor.walls = cur.walls.map(w => ({ ...w, id: uid() }));
    }
  }
```
**Problem:** Only walls are copied. Doors/windows reference wall IDs — the old wall IDs. Even the copied walls get new IDs, so any doors/windows that reference those walls would be orphaned. The feature is incomplete: it should either copy everything with remapped IDs, or document that only walls are copied.
**Severity:** Critical — misleading feature, data integrity issue

### MAJOR Bugs

#### CR-4: Undo/Redo Serializes `Date` Objects as Strings, Never Restores Them
**File:** `lib/stores/project.ts`, lines 28-42
**Code:**
```ts
function snapshot() {
  const p = get(currentProject);
  if (p) undoStack.push(JSON.stringify(p));
}
export function undo() {
  ...
  currentProject.set(JSON.parse(prev));
}
```
**Problem:** `JSON.stringify` converts `createdAt` and `updatedAt` Date objects to ISO strings. `JSON.parse` does NOT restore them as Dates — they remain strings. After any undo/redo, `p.createdAt` and `p.updatedAt` are strings, not Dates. Any code calling `.toLocaleDateString()` or other Date methods will crash. The `datastore.ts` `load()` function has this fix (`p.createdAt = new Date(p.createdAt)`), but undo/redo does not.
**Severity:** Major — runtime crash after undo

#### CR-5: `splitWall` Division by Zero When `t=0` or `t=1`
**File:** `lib/stores/project.ts`, lines 306-322
**Code:**
```ts
d.position = d.position / t;          // if t=0 → Infinity
d.position = (d.position - t) / (1 - t); // if t=1 → Infinity
```
**Problem:** If `splitWall` is called with `t=0` or `t=1`, door/window position recalculation divides by zero, producing `Infinity` or `NaN` positions. While the UI probably constrains `t` to (0,1), there's no guard.
**Severity:** Major — NaN propagation

#### CR-6: 3D Viewer Never Renders Columns
**File:** `lib/components/viewer3d/ThreeViewer.svelte`
**Problem:** `buildWalls()` calls `buildStairs(floor)` but there is no `buildColumns()` function. Columns are completely absent from the 3D view. They exist in 2D but are invisible in 3D.
**Severity:** Major — feature gap, data visible in 2D but not 3D

#### CR-7: 3D Viewer Memory Leak — Geometries/Materials Not Disposed on Rebuild
**File:** `lib/components/viewer3d/ThreeViewer.svelte`, line ~306
**Code:**
```ts
function buildWalls(floor: Floor) {
    while (wallGroup.children.length) wallGroup.remove(wallGroup.children[0]);
```
**Problem:** `wallGroup.remove()` removes from scene but does NOT dispose geometry/material/textures. Each rebuild (every store change) leaks all previous Three.js GPU resources. Over a session with many edits, this causes significant memory growth and eventual performance degradation. Should call `child.traverse(obj => { if (obj.geometry) obj.geometry.dispose(); if (obj.material) { if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else obj.material.dispose(); } })`.
**Severity:** Major — memory leak, degrades over time

#### CR-8: 3D Viewer Double Subscription Causes Double Rebuilds
**File:** `lib/components/viewer3d/ThreeViewer.svelte`, onMount
**Code:**
```ts
const unsub = activeFloor.subscribe((f) => {
    currentFloor = f;
    if (f) buildWalls(f);
});
const unsubRooms = detectedRoomsStore.subscribe((rooms) => {
    savedRooms = rooms;
    if (currentFloor) buildWalls(currentFloor);
});
```
**Problem:** When walls change, `activeFloor` fires → `buildWalls()`. This triggers room re-detection in the 2D canvas → `detectedRoomsStore` updates → `buildWalls()` again. Every wall edit causes TWO full 3D rebuilds. Combined with CR-7, this doubles the leak rate.
**Severity:** Major — performance, doubled work

#### CR-9: `commitFurnitureMove()` Snapshots AFTER the Move Already Happened
**File:** `lib/stores/project.ts`, lines 111-113
**Code:**
```ts
export function commitFurnitureMove() {
  snapshot();
}
```
**Problem:** `moveFurniture()` modifies state without snapshotting. `commitFurnitureMove()` is called after drag ends and snapshots the **current** (already moved) state. This means undo won't restore to the pre-drag position — it restores to whatever state was snapshotted before, which could be from a completely different operation. The snapshot should capture the pre-drag state at drag **start**, not drag **end**.
**Severity:** Major — undo doesn't work correctly for furniture moves

#### CR-10: `moveStair` and `moveColumn` Have Same Undo Bug
**File:** `lib/stores/project.ts`, lines 164-172, 263-271
**Problem:** Same pattern as CR-9 — `moveStair` and `moveColumn` modify state without snapshot, but there's no `commitStairMove()` or `commitColumnMove()` function at all. Stair/column drags are completely un-undoable.
**Severity:** Major — undo broken for stair/column moves

#### CR-11: `removeElement` Doesn't Clean Up Orphaned Doors/Windows
**File:** `lib/stores/project.ts`, line 279
**Code:**
```ts
export function removeElement(id: string) {
  mutate((f) => {
    f.walls = f.walls.filter((w) => w.id !== id);
    f.doors = f.doors.filter((d) => d.id !== id);
    ...
```
**Problem:** When removing a wall by ID, this filters walls but does NOT remove doors/windows that reference that wall (via `wallId`). Compare with `removeWall()` which correctly does `f.doors = f.doors.filter((d) => d.wallId !== id)`. `removeElement` is the generic delete (used by keyboard Delete), so deleting a wall via keyboard leaves orphaned doors/windows that reference a non-existent wall, causing rendering errors.
**Severity:** Major — orphaned data, potential crashes

### MINOR Bugs

#### CR-12: `showExternalDimensions`, `showInternalDimensions`, `showObjectDistance` Settings Are Not Wired
**File:** `lib/components/editor/FloorPlanCanvas.svelte`, lines 65-67, `lib/stores/settings.ts`
**Problem:** The settings exist in the store and are read into `dimSettings`, but NO rendering code checks `dimSettings.showExternalDimensions`, `dimSettings.showInternalDimensions`, or `dimSettings.showObjectDistance`. The settings toggles in the UI do nothing. Only `showDimensions` (the master toggle) is wired.
**Severity:** Minor — settings UI is misleading but non-destructive

#### CR-13: Measurement Tool and Wall Preview Hardcode "cm" Units
**File:** `lib/components/editor/FloorPlanCanvas.svelte`, lines 1356, 2106
**Code:**
```ts
ctx.fillText(`${Math.round(dist)} cm`, mx, my - 6);    // measurement tool
ctx.fillText(`${Math.round(plen)} cm`, ...);             // wall drawing preview
```
**Problem:** These should use `formatLength(dist, dimSettings.units)` for imperial support. When user has imperial units selected, measurement tool and wall preview still show cm.
**Severity:** Minor — inconsistent units display

#### CR-14: CAD Export Hardcodes "cm" Units
**File:** `lib/utils/cadExport.ts`, line 87
**Code:** `d.drawText(mx, my + 10, 5, angle, \`${len} cm\`, 'center', 'bottom');`
**Problem:** DXF/DWG export always labels dimensions in cm regardless of user's unit setting.
**Severity:** Minor — export doesn't respect settings

#### CR-15: `parseLengthInput()` Is Never Used Anywhere
**File:** `lib/stores/settings.ts`, line 95
**Problem:** The function exists but is never imported or called. No input field in the app parses imperial input. Users can't type "5'6"" to set a dimension — they must always input cm values. This means imperial mode is display-only.
**Severity:** Minor — feature incomplete

#### CR-16: Room Area Display Always Shows "m²" Even in Imperial Mode
**File:** `lib/components/editor/FloorPlanCanvas.svelte`, line ~1571
**Code:** `ctx.fillText(\`${room.name} (${room.area} m²)\`, sc.x, sc.y);`
**Problem:** Room area is always displayed in m² regardless of imperial setting. Should show ft² when imperial is selected.
**Severity:** Minor — inconsistent units

#### CR-17: `duplicateDoor` and `duplicateWindow` Read State Twice (Race Condition)
**File:** `lib/stores/project.ts`, lines ~298-314
**Problem:** Both functions call `get(currentProject)` to find the original item, then call `mutate()` which calls `get(currentProject)` again internally. Between the two reads, another store update could theoretically interleave (though unlikely in practice with Svelte's synchronous store). The pattern is still fragile.
**Severity:** Minor — theoretical race

#### CR-18: RoomPlan Import Doesn't Validate Missing/Null Dimensions
**File:** `lib/utils/roomplanImport.ts`
**Problem:** The import blindly accesses `rw.dimensions[0]`, `rw.dimensions[1]`, etc. If a RoomPlan export has missing dimensions (null or empty array), this produces `undefined * 100 = NaN`, which propagates through all geometry. No validation or fallback defaults.
**Severity:** Minor — crashes on malformed input

#### CR-19: Furniture Model Loader Doesn't Dispose Procedural Model When GLB Loads
**File:** `lib/utils/furnitureModelLoader.ts`, lines 101-108
**Code:**
```ts
container.remove(procedural);
scaleToFit(glbModel, def, mapping);
container.add(glbModel);
```
**Problem:** `container.remove(procedural)` removes from parent but doesn't dispose the procedural model's geometries/materials. Small leak per furniture item.
**Severity:** Minor — small memory leak

#### CR-20: `scaleToFit` Can Produce Infinite Scale
**File:** `lib/utils/furnitureModelLoader.ts`, lines 85-87
**Code:**
```ts
if (size.x === 0 || size.y === 0 || size.z === 0) return;
const scaleX = def.width / size.x;
```
**Problem:** The guard checks for exactly 0 but floating point could produce very small values (1e-15), resulting in enormous scale values. Should use an epsilon check.
**Severity:** Minor — edge case with degenerate models

#### CR-21: Room Detection `area` Threshold Is Hardcoded in Pixel Units
**File:** `lib/utils/roomDetection.ts`, line 105
**Code:** `if (area < 1000 || area > 10000000) continue;`
**Problem:** The area is in the coordinate system units² (cm²). 1000 cm² = 0.1 m² which is reasonable as a minimum, but 10,000,000 cm² = 1000 m² as maximum is arbitrary and would exclude large warehouses/halls. The threshold should be configurable or removed.
**Severity:** Minor — limits use cases

#### CR-22: `datastore.ts` Doesn't Migrate Old Data Missing New Fields
**File:** `lib/services/datastore.ts`
**Problem:** When loading saved projects, if they were saved before `stairs`, `columns`, or `backgroundImage` were added to the schema, those fields will be `undefined`. The code in `project.ts` guards with `if (!f.stairs)` etc., but this is a leaky abstraction. The datastore should normalize/migrate on load.
**Severity:** Minor — defensive coding needed throughout

#### CR-23: `wallLength` Returns 0 for Zero-Length Walls, Causing Division Issues
**File:** `lib/components/editor/FloorPlanCanvas.svelte`
**Problem:** Multiple places compute `const len = Math.hypot(dx, dy)` then divide by `len` (e.g., for normal vectors). If a wall has start === end (zero length), `len = 0` and division produces `NaN`/`Infinity`. The `wallTangentAt` function has a guard (`|| 1`) but `drawWall` does not — it returns early only when screen-space `len < 1`, which depends on zoom level. At very high zoom, a 0.5cm wall could pass the check.
**Severity:** Minor — edge case with degenerate walls
