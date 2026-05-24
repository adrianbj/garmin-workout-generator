import { vi } from "vitest";

export type LanguageModelMockOptions = {
  available?: boolean;
  promptResponse?: string;
  promptError?: Error;
};

export function installLanguageModelMock(opts: LanguageModelMockOptions = {}) {
  const session = {
    prompt: vi.fn(async (_input: string, _o?: unknown) => {
      if (opts.promptError) throw opts.promptError;
      return opts.promptResponse ?? "{}";
    }),
    destroy: vi.fn(),
  };
  const LanguageModel = {
    availability: vi.fn(async () => (opts.available === false ? "no" : "readily")),
    create: vi.fn(async () => session),
  };
  (globalThis as any).LanguageModel = LanguageModel;
  return { session, LanguageModel };
}

export function uninstallLanguageModelMock() {
  delete (globalThis as any).LanguageModel;
}
