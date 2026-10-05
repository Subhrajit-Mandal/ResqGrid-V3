import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDemo } from "../domain/store";
import { useDemoAuth } from "../auth/DemoAuth";
type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};
function objectInput(input: unknown) {
  return input !== null && typeof input === "object" && !Array.isArray(input);
}
type ModelContext = {
  registerTool: (
    tool: Tool,
    options: { signal: AbortSignal },
  ) => void | Promise<void>;
};
export function useWebTools() {
  const navigate = useNavigate();
  const { session } = useDemoAuth();
  const auth = useRef(session);
  auth.current = session;
  const demo = useDemo();
  const latest = useRef(demo);
  latest.current = demo;
  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools: Tool[] = [
      {
        name: "read_demo_situation",
        description:
          "Read aggregate simulated RESQGRID situation counts. No live emergency data is returned.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true },
        execute(input) {
          if (!objectInput(input) || Object.keys(input as object).length)
            throw new Error("Expected an empty object");
          const s = latest.current.state;
          return {
            mode: "browser-local-demo",
            activeIncidents: s.incidents.filter(
              (i) => !["Resolved", "Closed"].includes(i.status),
            ).length,
            publishedWarnings: s.warnings.filter(
              (w) =>
                w.status === "Published" && new Date(w.expiresAt) > new Date(),
            ).length,
            scenario: s.scenario,
            sample: s.sample,
            trainedModel: false,
          };
        },
      },
      {
        name: "start_demo_sos",
        description:
          "Navigate to the demo SOS form. This does not submit a request or contact emergency services.",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        async execute(input) {
          if (!objectInput(input) || Object.keys(input as object).length)
            throw new Error("Expected an empty object");
          navigate("/sos");
          await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          );
          return { route: "/sos", submitted: false, mode: "demo" };
        },
      },
      {
        name: "advance_demo_scenario",
        description:
          "Advance 1 to 5 synthetic samples and show the intelligence workspace. No hardware measurements are sent.",
        inputSchema: {
          type: "object",
          properties: { samples: { type: "integer", minimum: 1, maximum: 5 } },
          required: ["samples"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        async execute(input) {
          const value = input as { samples?: unknown };
          if (
            !objectInput(value) ||
            Object.keys(value).some((k) => k !== "samples") ||
            !Number.isInteger(value.samples) ||
            Number(value.samples) < 1 ||
            Number(value.samples) > 5
          )
            throw new Error("samples must be an integer between 1 and 5");
          if (auth.current?.role !== "admin")
            throw new Error("Super Admin demo access required");
          const next = {
            ...latest.current.state,
            sample: latest.current.state.sample + Number(value.samples),
          };
          latest.current.mutate(() => next, "Agent advanced demo scenario");
          navigate("/intelligence");
          await new Promise<void>((r) =>
            requestAnimationFrame(() => requestAnimationFrame(() => r())),
          );
          return { mode: "demo", sample: next.sample };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* optional API unavailable */
      }
    }
    return () => lifecycle.abort();
  }, [navigate]);
}
