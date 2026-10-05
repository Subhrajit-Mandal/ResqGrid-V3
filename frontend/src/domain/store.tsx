import { createId } from "../shared/ids";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { initialState } from "./fixtures";
import type { DemoState } from "./types";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const Context = createContext<{
  state: DemoState;
  mutate: (fn: (s: DemoState) => DemoState, action?: string) => void;
  reset: () => void;
  notice: string;
  notify: (s: string) => void;
} | null>(null);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(() => initialState());
  const [notice, notify] = useState("");

  // Load the centralized state from Supabase
  useEffect(() => {
    async function loadState() {
      const { data, error } = await supabase
        .from("resqgrid_demo_state")
        .select("state")
        .eq("id", 1)
        .maybeSingle();

      if (error) {
        console.error("Supabase load error:", error);
        notify("Could not load centralized data. Using demo data.");
        return;
      }

      if (data?.state) {
        setState(data.state as DemoState);
      } else {
        // First run: put the existing demo data into Supabase
        const initial = initialState();

        const { error: insertError } = await supabase
          .from("resqgrid_demo_state")
          .insert({
            id: 1,
            state: initial,
          });

        if (insertError) {
          console.error("Supabase initial insert error:", insertError);
          notify("Could not initialize centralized data.");
          return;
        }

        setState(initial);
      }
    }

    loadState();
  }, []);

  // Save every state change to Supabase
  useEffect(() => {
    async function saveState() {
      const { error } = await supabase
        .from("resqgrid_demo_state")
        .upsert({
          id: 1,
          state,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error("Supabase save error:", error);
        notify("Database update failed.");
      }
    }

    saveState();
  }, [state]);

  // Clear notification
  useEffect(() => {
    if (!notice) return;

    const timer = setTimeout(() => notify(""), 5000);

    return () => clearTimeout(timer);
  }, [notice]);

  const mutate = (fn: (s: DemoState) => DemoState, action?: string) =>
    setState((s) => {
      const result = fn(s);

      return action
        ? {
            ...result,
            audit: [
              {
                id: createId(),
                time: new Date().toISOString(),
                action,
              },
              ...result.audit,
            ].slice(0, 200),
          }
        : result;
    });

  const reset = async () => {
    const fresh = initialState();

    setState(fresh);

    const { error } = await supabase
      .from("resqgrid_demo_state")
      .upsert({
        id: 1,
        state: fresh,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Supabase reset error:", error);
      notify("Database reset failed.");
    }
  };

  return (
    <Context.Provider
      value={{
        state,
        mutate,
        reset,
        notice,
        notify,
      }}
    >
      {children}

      <div
        className={"toast " + (notice ? "visible" : "")}
        role="status"
      >
        {notice}
      </div>
    </Context.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(Context);

  if (!ctx) {
    throw new Error("Demo provider unavailable");
  }

  return ctx;
}