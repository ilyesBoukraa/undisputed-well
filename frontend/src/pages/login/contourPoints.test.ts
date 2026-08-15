import {
  CONTOUR_TRACK_1,
  CONTOUR_TRACK_2,
  VIEWBOX_WIDTH,
  samplePolylinePoints,
} from "./contourPoints";

describe("contourPoints", () => {
  it("every configured line's period evenly divides the viewbox width (seamless horizontal loop)", () => {
    for (const line of [...CONTOUR_TRACK_1, ...CONTOUR_TRACK_2]) {
      expect(VIEWBOX_WIDTH % line.period).toBe(0);
    }
  });

  it("samples a point string starting and ending at the same y value, for a given line", () => {
    const line = CONTOUR_TRACK_1[0];
    const points = samplePolylinePoints(line).split(" ");
    const [firstX, firstY] = points[0].split(",").map(Number);
    const [lastX, lastY] = points[points.length - 1].split(",").map(Number);

    expect(firstX).toBe(0);
    expect(lastX).toBe(VIEWBOX_WIDTH);
    expect(lastY).toBeCloseTo(firstY, 1);
  });

  it("samples the requested number of segments", () => {
    const points = samplePolylinePoints(CONTOUR_TRACK_2[0], 10).split(" ");
    expect(points).toHaveLength(11);
  });
});
