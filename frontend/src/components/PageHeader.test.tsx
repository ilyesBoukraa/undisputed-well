import { render, screen } from "@testing-library/react";
import { ThemeModeProvider } from "../theme/ThemeModeProvider";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renders the eyebrow and title", () => {
    render(
      <ThemeModeProvider>
        <PageHeader eyebrow="Fleet management" title="Rigs" />
      </ThemeModeProvider>,
    );

    expect(screen.getByText("Fleet management")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Rigs" })).toBeInTheDocument();
  });

  it("renders the action slot when provided", () => {
    render(
      <ThemeModeProvider>
        <PageHeader eyebrow="Fleet management" title="Rigs" action={<button>New Rig</button>} />
      </ThemeModeProvider>,
    );

    expect(screen.getByRole("button", { name: "New Rig" })).toBeInTheDocument();
  });

  it("omits the action slot when not provided", () => {
    render(
      <ThemeModeProvider>
        <PageHeader eyebrow="Fleet management" title="Rigs" />
      </ThemeModeProvider>,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
