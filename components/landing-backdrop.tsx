import type { CSSProperties } from "react";
import styles from "@/app/landing.module.css";

type TileColor = "sky" | "orange" | "violet" | "green" | "pink" | "black";
type Tile = readonly [column: number, row: number, color: TileColor, anchor?: "bottom"];

interface TileLayout {
  name: "mobile" | "tablet" | "desktop";
  tiles: readonly Tile[];
}

interface TileStyle extends CSSProperties {
  "--column": number;
  "--row": number;
}

// Coordinates are grid cells. Bottom rows count up from the last complete cell.
// Fixed maps keep the server markup deterministic; CSS selects the layout.
const layouts: readonly TileLayout[] = [
  {
    name: "mobile",
    tiles: [
      [0, 1, "green"], [1, 2, "sky"], [1, 0, "orange"],
      [6, 0, "black"], [7, 1, "violet"], [6, 2, "pink"],
      [0, 1, "violet", "bottom"], [1, 0, "orange", "bottom"],
      [6, 1, "green", "bottom"], [7, 2, "sky", "bottom"],
    ],
  },
  {
    name: "tablet",
    tiles: [
      [1, 1, "green"], [2, 2, "sky"], [4, 0, "orange"],
      [12, 1, "black"], [13, 2, "violet"], [11, 2, "pink"],
      [12, 3, "sky"], [14, 4, "orange"],
      [0, 5, "pink"], [1, 6, "orange"], [15, 6, "green"],
      [1, 1, "black", "bottom"], [3, 2, "violet", "bottom"],
      [4, 3, "orange", "bottom"], [5, 4, "green", "bottom"],
      [10, 0, "pink", "bottom"], [12, 2, "green", "bottom"],
      [14, 1, "violet", "bottom"], [15, 3, "sky", "bottom"],
    ],
  },
  {
    name: "desktop",
    tiles: [
      [1, 1, "green"], [2, 2, "sky"], [8, 2, "orange"],
      [7, 3, "violet"], [9, 4, "black"], [13, 1, "sky"],
      [17, 2, "pink"], [19, 2, "violet"], [20, 1, "black"],
      [18, 3, "sky"], [17, 4, "green"], [19, 4, "orange"],
      [2, 5, "orange"], [1, 6, "pink"], [3, 6, "green"],
      [2, 7, "sky"], [3, 8, "violet"], [22, 6, "orange"],
      [21, 7, "sky"],
      [6, 2, "pink", "bottom"], [7, 3, "orange", "bottom"],
      [8, 4, "green", "bottom"], [10, 2, "sky", "bottom"],
      [1, 1, "black", "bottom"], [13, 6, "violet", "bottom"],
      [14, 5, "black", "bottom"], [15, 4, "green", "bottom"],
      [14, 3, "orange", "bottom"], [19, 3, "green", "bottom"],
      [22, 1, "violet", "bottom"], [15, 0, "pink", "bottom"],
    ],
  },
];

export function LandingBackdrop() {
  return (
    <div className={styles.backdrop} data-landing-backdrop="" aria-hidden="true">
      <div className={styles.artwork}>
        {layouts.map(({ name, tiles }) => (
          <div className={styles.tileLayout} data-layout={name} key={name}>
            {tiles.map(([column, row, color, anchor]) => (
              <span
                key={`${column}-${row}-${anchor ?? "top"}`}
                className={styles.tile}
                data-color={color}
                data-anchor={anchor ?? "top"}
                style={{ "--column": column, "--row": row } as TileStyle}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
