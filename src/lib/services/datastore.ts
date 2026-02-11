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
    localStorage.setItem(KEY, JSON.stringify(all));
  },

  async load(id) {
    const all = getAll();
    const raw = all[id];
    if (!raw) return null;
    const p = JSON.parse(raw);
    p.createdAt = new Date(p.createdAt);
    p.updatedAt = new Date(p.updatedAt);
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
