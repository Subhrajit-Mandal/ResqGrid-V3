// @vitest-environment jsdom
import React from "react";
import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { DemoProvider } from "../../frontend/src/domain/store";
import {
  DEMO_PASSWORD,
  SESSION_KEY,
  type DemoRole,
} from "../../frontend/src/auth/config";
import { App } from "../../frontend/src/App";
vi.mock("../../frontend/src/shared/MapView", () => ({
  MapView: () => <div aria-label="Map test placeholder" />,
}));
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: () => null,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  AreaChart: () => null,
  Area: () => null,
}));
function mount(path: string, role: DemoRole | null = "admin") {
  if (role)
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ role, expiresAt: Date.now() + 3600000 }),
    );
  render(
    <MemoryRouter initialEntries={[path]}>
      <DemoProvider>
        <App />
      </DemoProvider>
    </MemoryRouter>,
  );
}
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  delete (document as any).modelContext;
});
describe("V3 UI workflows", () => {
  it.each([
    "/",
    "/sos",
    "/operations",
    "/operations/resources",
    "/operations/coordination",
    "/intelligence",
    "/intelligence/devices",
    "/intelligence/models",
    "/admin",
    "/operations/recovery",
  ])("renders workspace %s without crashing", async (path) => {
    mount(path);
    expect(
      (await screen.findAllByRole("heading", { level: 1 })).length,
    ).toBeGreaterThan(0);
  });
  it("creates a citizen request that the rescue queue can assign", async () => {
    const user = userEvent.setup();
    mount("/sos", "citizen");
    await user.click(
      screen.getByRole("button", { name: "Continue", exact: true }),
    );
    expect(screen.getByRole("alert").textContent).toContain("landmark");
    await user.type(
      screen.getByLabelText("Demo landmark"),
      "Fictional integration gate",
    );
    await user.click(
      screen.getByRole("button", { name: "Continue", exact: true }),
    );
    fireEvent.change(screen.getByLabelText("Number of people"), {
      target: { value: "3" },
    });
    await user.click(
      screen.getByRole("button", { name: "Continue", exact: true }),
    );
    await user.click(screen.getByRole("button", { name: "Confirm demo SOS" }));
    expect(
      screen.getByRole("heading", { name: "Request tracking" }),
    ).toBeTruthy();
    await switchRole(user, "Agency Login");
    await user.type(
      await screen.findByLabelText("Search incidents"),
      "Fictional integration gate",
    );
    await user.click(document.querySelector(".incident-row")!);
    await user.selectOptions(screen.getByLabelText("Available team"), "R-03");
    await user.click(
      screen.getByRole("button", { name: "Assign team", exact: true }),
    );
    expect(
      within(document.querySelector("dialog")!).getAllByText(
        /River Team Charlie/,
      ).length,
    ).toBeGreaterThan(0);
    await user.click(
      screen.getByRole("button", { name: "Mark en route", exact: true }),
    );
    const saved = JSON.parse(localStorage.getItem("resqgrid-v3-demo-v1")!);
    const incident = saved.incidents.find(
      (i: any) => i.landmark === "Fictional integration gate",
    );
    expect(incident.status).toBe("En route");
    expect(incident.teamId).toBe("R-03");
    await user.click(screen.getByRole("button", { name: "Close incident" }));
    await switchRole(user, "Citizen Login");
    await user.click(
      screen.getByRole("link", { name: "My requests", exact: true }),
    );
    await user.click(await screen.findByText("Fictional integration gate"));
    expect(
      document.querySelector(".request-detail-grid")!.textContent,
    ).toContain("En route");
    expect(
      document.querySelector(".request-detail-grid")!.textContent,
    ).toContain("River Team Charlie");
  });
  it("blocks stale and single spike warning candidates", async () => {
    const user = userEvent.setup();
    mount("/intelligence");
    await user.selectOptions(
      await screen.findByLabelText("Select simulated scenario"),
      "spike",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Create warning candidate",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.selectOptions(
      screen.getByLabelText("Select simulated scenario"),
      "stale",
    );
    expect(
      (
        screen.getByRole("button", {
          name: "Create warning candidate",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("publishes a reviewed draft into the citizen warning view", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const user = userEvent.setup();
    mount("/intelligence/warnings");
    await user.click(
      await screen.findByRole("button", { name: "Approve & publish" }),
    );
    await switchRole(user, "Citizen Login");
    await user.selectOptions(screen.getByLabelText("Your demo area"), "Z-02");
    expect(
      screen.getByRole("heading", {
        name: "Eastern catchment requires monitoring",
      }),
    ).toBeTruthy();
  });
  it("validates optional agent inputs and advances shared demo state", async () => {
    const registry: Record<string, any> = {};
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: (tool: any, options: any) => {
          registry[tool.name] = tool;
          options.signal.addEventListener(
            "abort",
            () => delete registry[tool.name],
          );
        },
      },
    });
    vi.stubGlobal("requestAnimationFrame", (fn: any) => setTimeout(fn, 0));
    mount("/intelligence");
    await screen.findByRole("heading", { name: "Situation overview" });
    const before = registry.read_demo_situation.execute({});
    expect(() => registry.read_demo_situation.execute([])).toThrow();
    await expect(
      registry.advance_demo_scenario.execute({ samples: 99 }),
    ).rejects.toThrow();
    const after = await registry.advance_demo_scenario.execute({ samples: 2 });
    expect(after.sample).toBe(before.sample + 2);
    expect(
      JSON.parse(localStorage.getItem("resqgrid-v3-demo-v1")!).sample,
    ).toBe(after.sample);
    cleanup();
    expect(Object.keys(registry)).toHaveLength(0);
  });
});

async function switchRole(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
) {
  await user.click(document.querySelector(".account summary")!);
  await user.click(
    screen.getByRole("button", { name: "Log out / switch role" }),
  );
  await user.click(
    await screen.findByRole("button", { name: new RegExp(label) }),
  );
  await user.type(screen.getByLabelText("Demo password"), DEMO_PASSWORD);
  await user.click(screen.getByRole("button", { name: "Enter workspace" }));
  await screen.findByRole("heading", {
    name:
      label === "Citizen Login"
        ? "Your local situation"
        : label === "Agency Login"
          ? "Response overview"
          : "Administration",
  });
}
describe("role access and landing", () => {
  it("offers exactly three accessible demo login roles", async () => {
    const user = userEvent.setup();
    mount("/", null);
    expect(screen.getByRole("heading", { name: /Welcome to/ })).toBeTruthy();
    expect(document.querySelectorAll(".image-landing-sections a")).toHaveLength(
      4,
    );
    expect(screen.getByRole("img").getAttribute("src")).toBe(
      "/art/landing-approved.png",
    );
    await user.click(screen.getByRole("button", { name: "LOGIN" }));
    expect(document.querySelectorAll(".role-option")).toHaveLength(3);
    expect(screen.getByRole("dialog").getAttribute("aria-labelledby")).toBe(
      "login-title",
    );
  });
  it("rejects invalid passwords then persists a correct citizen session", async () => {
    const user = userEvent.setup();
    mount("/", null);
    await user.click(screen.getByRole("button", { name: "LOGIN" }));
    await user.click(screen.getByRole("button", { name: /Citizen Login/ }));
    await user.type(screen.getByLabelText("Demo password"), "incorrect");
    await user.click(screen.getByRole("button", { name: "Enter workspace" }));
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Incorrect",
    );
    await user.clear(screen.getByLabelText("Demo password"));
    await user.type(screen.getByLabelText("Demo password"), DEMO_PASSWORD);
    await user.click(screen.getByRole("button", { name: "Enter workspace" }));
    await screen.findByRole("heading", { name: "Your local situation" });
    expect(JSON.parse(localStorage.getItem(SESSION_KEY)!).role).toBe("citizen");
    expect(
      screen.queryByRole("link", { name: "Rescue operations", exact: true }),
    ).toBeNull();
    expect(screen.queryByText("Reset demo data")).toBeNull();
  });
  it.each(["/operations", "/intelligence", "/admin"])(
    "blocks citizen access to %s",
    async (path) => {
      mount(path, "citizen");
      await screen.findByRole("heading", { name: "Choose your workspace" });
      expect(document.querySelector(".incident-list")).toBeNull();
    },
  );
  it("does not accept an expired demo session", async () => {
    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ role: "admin", expiresAt: Date.now() - 1 }),
    );
    mount("/admin", null);
    await screen.findByRole("heading", { name: "Choose your workspace" });
  });
  it("refuses operational agent mutation as a citizen", async () => {
    const registry: Record<string, any> = {};
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {
        registerTool: (tool: any) => {
          registry[tool.name] = tool;
        },
      },
    });
    mount("/me", "citizen");
    await expect(
      registry.advance_demo_scenario.execute({ samples: 1 }),
    ).rejects.toThrow("Super Admin");
    expect(
      JSON.parse(localStorage.getItem("resqgrid-v3-demo-v1")!).sample,
    ).toBe(4);
  });
});
