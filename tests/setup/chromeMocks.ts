import { vi, beforeEach } from "vitest";

type Listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => void;

function makeStorageArea() {
  const data = new Map<string, unknown>();
  const listeners: Listener[] = [];

  const area = {
    get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys == null) {
        return Object.fromEntries(data);
      }
      const list = typeof keys === "string" ? [keys] : Array.isArray(keys) ? keys : Object.keys(keys);
      const out: Record<string, unknown> = {};
      for (const k of list) if (data.has(k)) out[k] = data.get(k);
      return out;
    }),
    set: vi.fn(async (obj: Record<string, unknown>) => {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const [k, v] of Object.entries(obj)) {
        changes[k] = { oldValue: data.get(k), newValue: v };
        data.set(k, v);
      }
      for (const l of listeners) l(changes, "sync");
    }),
    remove: vi.fn(async (keys: string | string[]) => {
      for (const k of Array.isArray(keys) ? keys : [keys]) data.delete(k);
    }),
    clear: vi.fn(async () => data.clear()),
  };
  return { area, listeners };
}

const sync = makeStorageArea();

globalThis.chrome = {
  storage: {
    sync: sync.area as unknown as chrome.storage.SyncStorageArea,
    onChanged: {
      addListener: (l: Listener) => sync.listeners.push(l),
      removeListener: (l: Listener) => {
        const i = sync.listeners.indexOf(l);
        if (i >= 0) sync.listeners.splice(i, 1);
      },
    } as unknown as chrome.storage.StorageChangedEvent,
  },
} as unknown as typeof chrome;

beforeEach(async () => {
  await chrome.storage.sync.clear();
});
