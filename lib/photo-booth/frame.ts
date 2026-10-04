// Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V4
// Shared output geometry for the supplied 1412×2508 Sue artwork.
const OUTPUT_WIDTH = 1080;
const OUTPUT_HEIGHT = 1920;
const SOURCE_WIDTH = 1412;
const SOURCE_HEIGHT = 2508;

// One source pixel of bleed beneath the artwork prevents seams at soft window edges.
const SOURCE_WINDOWS = [
  { left: 200, top: 201, width: 1012, height: 586 },
  { left: 200, top: 986, width: 1012, height: 537 },
  { left: 200, top: 1722, width: 1012, height: 586 },
] as const;

export const PHOTO_BOOTH_FRAME = {
  src: "/assets/south-summit-sue-frame.png",
  width: OUTPUT_WIDTH,
  height: OUTPUT_HEIGHT,
  backgroundColor: "#161d26",
  slots: SOURCE_WINDOWS.map((slot) => ({
    left: (slot.left / SOURCE_WIDTH) * OUTPUT_WIDTH,
    top: (slot.top / SOURCE_HEIGHT) * OUTPUT_HEIGHT,
    width: (slot.width / SOURCE_WIDTH) * OUTPUT_WIDTH,
    height: (slot.height / SOURCE_HEIGHT) * OUTPUT_HEIGHT,
  })),
} as const;
