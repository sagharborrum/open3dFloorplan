import type { Project } from '$lib/models/types';

export interface DataStore {
  save(project: Project): Promise<void>;
  load(id: string): Promise<Project | null>;
  list(): Promise<{ id: string; name: string; updatedAt: string }[]>;
  delete(id: string): Promise<void>;
}

const KEY = 'floorplan_projects';

function getAll(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
}

export const localStore: DataStore = {
  async save(project) {
    const all = getAll();
    all[project.id] = JSON.stringify(project);
    try {
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch (e: any) {
      if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.code === 1014) {
        console.warn('[DataStore] localStorage quota exceeded');
        // Attempt to save just this project by removing others if needed
        const minimal: Record<string, string> = {};
        minimal[project.id] = all[project.id];
        try {
          localStorage.setItem(KEY, JSON.stringify(minimal));
          alert('Storage quota exceeded. Other projects were removed to save this one. Consider exporting important projects as JSON.');
        } catch {
          alert('Storage quota exceeded. Please export your project as JSON and clear browser data.');
        }
      } else {
        throw e;
      }
    }
  },

  async load(id) {
    const all = getAll();
    const raw = all[id];
    if (!raw) return null;
    const p = JSON.parse(raw);
    p.createdAt = new Date(p.createdAt);
    p.updatedAt = new Date(p.updatedAt);
    // Migrate floors: ensure all array fields exist
    for (const floor of (p.floors ?? [])) {
      if (!floor.rooms) floor.rooms = [];
      if (!floor.doors) floor.doors = [];
      if (!floor.windows) floor.windows = [];
      if (!floor.furniture) floor.furniture = [];
      if (!floor.stairs) floor.stairs = [];
      if (!floor.columns) floor.columns = [];
    }
    return p as Project;
  },

  async list() {
    const all = getAll();
    return Object.values(all).map((raw) => {
      const p = JSON.parse(raw as string);
      return { id: p.id, name: p.name, updatedAt: p.updatedAt };
    });
  },

  async delete(id) {
    const all = getAll();
    delete all[id];
    localStorage.setItem(KEY, JSON.stringify(all));
  },
};
