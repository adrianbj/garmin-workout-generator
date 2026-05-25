import "./panel.css";
import { startMounting } from "./mount";
import type { PanelHandle, PanelState } from "./panel";
import { parse } from "../parser/parse";
import { translate } from "../garmin/translate";
import { createWorkout } from "../garmin/client";
import { getZoneConfig } from "../storage/storage";
import type { WorkoutPlan, ParseError } from "../parser/types";

type AppState =
  | { mode: "needs-config" }
  | { mode: "idle"; text: string }
  | { mode: "loading"; text: string }
  | { mode: "ready"; text: string; plan: WorkoutPlan; errors: ParseError[] }
  | { mode: "saving"; text: string; plan: WorkoutPlan }
  | { mode: "error"; text: string; message: string };

let state: AppState = { mode: "idle", text: "" };
let handle: PanelHandle | undefined;
let contextInvalidated = false;

function render() {
  if (!handle) return;
  handle.setState(state as PanelState);
}

// True when the extension has been reloaded/updated while this content script
// is still running on the page — chrome.* APIs throw "Extension context invalidated"
// in that state. The page needs to be refreshed.
function isContextInvalidated(e: unknown): boolean {
  return e instanceof Error && /Extension context invalidated/i.test(e.message);
}

function markPageStale(text: string): void {
  contextInvalidated = true;
  state = {
    mode: "error",
    text,
    message: "Extension was just updated — refresh this page (Cmd+Shift+R) to continue.",
  };
  render();
}

async function bootstrap() {
  try {
    const zones = await getZoneConfig();
    if (zones.zones.length === 0) {
      state = { mode: "needs-config" };
      render();
      return;
    }
  } catch (e) {
    if (isContextInvalidated(e)) markPageStale(state.mode === "idle" ? state.text : "");
    else throw e;
  }
}

async function onGenerate(text: string): Promise<void> {
  if (contextInvalidated) return;
  if (text.trim() === "") return;
  state = { mode: "loading", text };
  render();
  try {
    const zones = await getZoneConfig();
    const result = await parse(text, zones);
    if (!result.ok) {
      state = { mode: "error", text, message: friendlyParseError(result.error.code, result.error.message) };
      render();
      return;
    }
    state = { mode: "ready", text, plan: result.value.plan, errors: result.value.errors };
    render();
  } catch (e) {
    if (isContextInvalidated(e)) markPageStale(text);
    else throw e;
  }
}

async function onSave(): Promise<void> {
  if (contextInvalidated) return;
  if (state.mode !== "ready") return;
  const { text, plan } = state;
  state = { mode: "saving", text, plan };
  render();
  try {
    const zones = await getZoneConfig();
    const garminJson = translate(plan, zones);
    const result = await createWorkout(garminJson);
    if (!result.ok) {
      state = { mode: "error", text, message: friendlyGarminError(result.error.code, result.error.message) };
      render();
      return;
    }
    window.location.assign(`/app/workout/${result.value.workoutId}?workoutType=running`);
  } catch (e) {
    if (isContextInvalidated(e)) markPageStale(text);
    else throw e;
  }
}

function onOpenOptions(): void {
  if (contextInvalidated) return;
  try {
    chrome.runtime.sendMessage({ type: "open-options" });
  } catch (e) {
    if (isContextInvalidated(e)) markPageStale("");
  }
}

function friendlyParseError(code: string, message: string): string {
  switch (code) {
    case "NOT_AVAILABLE":
      return "On-device AI isn't ready. Open chrome://on-device-internals to check Gemini Nano status, or set a Gemini API key in the extension options for better quality.";
    case "MALFORMED":
      return "The model returned an unexpected format. Try rephrasing the description.";
    case "PROMPT_FAILED":
      return `The model failed to respond (${message}). Try again.`;
    case "BAD_API_KEY":
      return "Gemini API rejected the key. Check it in the extension options.";
    case "RATE_LIMITED":
      return "Hit Gemini's rate limit. Wait a minute and try again.";
    case "UNREACHABLE":
      return "Couldn't reach Gemini's API. Check your connection.";
    default:
      return message;
  }
}

function friendlyGarminError(code: string, message: string): string {
  switch (code) {
    case "SESSION_EXPIRED": return "Garmin session expired — refresh the page and try again.";
    case "NO_CSRF_TOKEN":   return "Couldn't find Garmin's CSRF token — refresh the page and try again.";
    case "BAD_REQUEST":     return `Garmin rejected the workout: ${message}`;
    case "UNREACHABLE":     return "Garmin is unreachable. Check your connection and try again.";
    default:                return message;
  }
}

startMounting({
  callbacks: {
    onGenerate,
    onSave,
    onOpenOptions,
  },
  onMount: (h) => {
    handle = h;
    render();
    void bootstrap();
  },
  onUnmount: () => {
    handle = undefined;
  },
});
