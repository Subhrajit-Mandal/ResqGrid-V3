import { lazy, Suspense } from "react";
import type { Incident } from "../domain/types";
import { zones } from "../domain/fixtures";
const Canvas = lazy(() =>
  import("./MapCanvas").then((m) => ({ default: m.MapView })),
);
type Props = {
  selected?: string;
  onSelect?: (id: string) => void;
  incidents?: Incident[];
  large?: boolean;
  light?: boolean;
};
export function MapView(props: Props) {
  return (
    <Suspense
      fallback={
        <div className={`map-shell map-loading ${props.large ? "large" : ""}`}>
          <p role="status">Loading interactive map…</p>
          <div className="map-zone-list">
            {zones.map((zone) => (
              <button key={zone.id} onClick={() => props.onSelect?.(zone.id)}>
                {zone.name}
              </button>
            ))}
          </div>
        </div>
      }
    >
      <Canvas {...props} />
    </Suspense>
  );
}
