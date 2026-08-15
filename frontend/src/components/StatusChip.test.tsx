import { render, screen } from "@testing-library/react";
import { ThemeModeProvider } from "../theme/ThemeModeProvider";
import { StatusChip } from "./StatusChip";

describe("StatusChip", () => {
  it.each([
    ["active", "MuiChip-colorSuccess"],
    ["producing", "MuiChip-colorSuccess"],
    ["maintenance", "MuiChip-colorWarning"],
    ["drilling", "MuiChip-colorInfo"],
    ["idle", "MuiChip-colorDefault"],
    ["shut_in", "MuiChip-colorDefault"],
    ["abandoned", "MuiChip-colorDefault"],
  ])("renders %s with the %s color class", (status, colorClass) => {
    render(
      <ThemeModeProvider>
        <StatusChip status={status} />
      </ThemeModeProvider>,
    );

    const chip = screen.getByText(status);
    expect(chip.closest(".MuiChip-root")).toHaveClass(colorClass);
  });

  it("falls back to the default color for an unrecognized status", () => {
    render(
      <ThemeModeProvider>
        <StatusChip status="mystery" />
      </ThemeModeProvider>,
    );

    const chip = screen.getByText("mystery");
    expect(chip.closest(".MuiChip-root")).toHaveClass("MuiChip-colorDefault");
  });
});
