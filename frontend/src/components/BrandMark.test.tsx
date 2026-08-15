import { render, screen } from "@testing-library/react";
import { ThemeModeProvider } from "../theme/ThemeModeProvider";
import { BrandMark } from "./BrandMark";

describe("BrandMark", () => {
  it("renders with the default size", () => {
    render(
      <ThemeModeProvider>
        <BrandMark />
      </ThemeModeProvider>,
    );

    const mark = screen.getByRole("img", { name: "UndisputedWell" });
    expect(mark).toHaveAttribute("width", "34");
    expect(mark).toHaveAttribute("height", "34");
  });

  it("renders at a custom size", () => {
    render(
      <ThemeModeProvider>
        <BrandMark size={20} />
      </ThemeModeProvider>,
    );

    const mark = screen.getByRole("img", { name: "UndisputedWell" });
    expect(mark).toHaveAttribute("width", "20");
    expect(mark).toHaveAttribute("height", "20");
  });
});
