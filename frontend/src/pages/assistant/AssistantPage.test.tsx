import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { streamAiQuery } from "../../api/ai";
import { jsonResponse, mockFetchByPath, renderWithProviders } from "../../test/renderWithProviders";
import { AssistantPage } from "./AssistantPage";

jest.mock("../../api/ai");
const mockStreamAiQuery = streamAiQuery as jest.MockedFunction<typeof streamAiQuery>;

function mockAuth() {
  mockFetchByPath({
    "/api/auth/me": () =>
      jsonResponse({ id: 1, email: "e@undisputedwell.dev", role: "engineer", permissions: ["ai:query"] }),
  });
}

describe("AssistantPage", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it("shows the empty state before any question is asked", async () => {
    mockAuth();

    renderWithProviders(<AssistantPage />);

    await waitFor(() => expect(screen.getByTestId("assistant-empty")).toBeInTheDocument());
  });

  it("keeps the Send button disabled for an empty or whitespace-only question", async () => {
    const user = userEvent.setup();
    mockAuth();

    renderWithProviders(<AssistantPage />);
    await user.type(screen.getByLabelText("Ask a question"), "   ");

    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    expect(mockStreamAiQuery).not.toHaveBeenCalled();
  });

  it("sends a question and renders the streamed answer", async () => {
    const user = userEvent.setup();
    mockAuth();
    mockStreamAiQuery.mockImplementation(async (_q, onEvent) => {
      onEvent({ type: "sources", sources: ["Wells & Rigs Management"] });
      onEvent({ type: "token", token: "Only " });
      onEvent({ type: "token", token: "admins." });
      onEvent({ type: "done" });
    });

    renderWithProviders(<AssistantPage />);
    await user.type(screen.getByLabelText("Ask a question"), "who can delete a rig");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(mockStreamAiQuery).toHaveBeenCalledWith("who can delete a rig", expect.any(Function));
    await waitFor(() => expect(screen.getByText("Only admins.")).toBeInTheDocument());
    expect(screen.getByText("who can delete a rig")).toBeInTheDocument();
    expect(screen.getByText("Wells & Rigs Management")).toBeInTheDocument();
  });

  it("clears the input after sending", async () => {
    const user = userEvent.setup();
    mockAuth();
    mockStreamAiQuery.mockResolvedValue(undefined);

    renderWithProviders(<AssistantPage />);
    const input = screen.getByLabelText("Ask a question");
    await user.type(input, "who can delete a rig");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() => expect(input).toHaveValue(""));
  });

  it("disables the input and shows a thinking state while streaming", async () => {
    const user = userEvent.setup();
    mockAuth();
    mockStreamAiQuery.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(<AssistantPage />);
    await user.type(screen.getByLabelText("Ask a question"), "who can delete a rig");
    await user.click(screen.getByRole("button", { name: "Send" }));

    expect(await screen.findByRole("button", { name: "Thinking…" })).toBeDisabled();
    expect(screen.getByLabelText("Ask a question")).toBeDisabled();
  });

  it("shows an error message when the stream fails", async () => {
    const user = userEvent.setup();
    mockAuth();
    mockStreamAiQuery.mockRejectedValue(new Error("boom"));

    renderWithProviders(<AssistantPage />);
    await user.type(screen.getByLabelText("Ask a question"), "who can delete a rig");
    await user.click(screen.getByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(screen.getByText("Something went wrong. Please try again.")).toBeInTheDocument(),
    );
  });
});
