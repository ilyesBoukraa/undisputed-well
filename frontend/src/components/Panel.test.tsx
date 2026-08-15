import { render, screen } from "@testing-library/react";
import { ThemeModeProvider } from "../theme/ThemeModeProvider";
import { Panel } from "./Panel";

describe("Panel", () => {
  it("renders its children", () => {
    render(
      <ThemeModeProvider>
        <Panel>content</Panel>
      </ThemeModeProvider>,
    );

    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("passes through non-sx props like data-testid", () => {
    render(
      <ThemeModeProvider>
        <Panel data-testid="my-panel">content</Panel>
      </ThemeModeProvider>,
    );

    expect(screen.getByTestId("my-panel")).toBeInTheDocument();
  });

  it("accepts a caller-provided sx override without throwing", () => {
    render(
      <ThemeModeProvider>
        <Panel sx={{ p: 4, maxWidth: 480 }} data-testid="my-panel">
          content
        </Panel>
      </ThemeModeProvider>,
    );

    expect(screen.getByTestId("my-panel")).toBeInTheDocument();
  });
});
