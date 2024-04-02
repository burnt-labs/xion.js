import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from "@testing-library/react";
import { WalletSendForm } from "./WalletSendForm";

// Dependencies
jest.mock("@/hooks", () => ({
  useAbstraxionAccount: () => ({ data: { id: "mock-account-id" } }),
}));
jest.mock("@/utils", () => ({
  formatBalance: (balance: number) => `Formatted ${balance}`,
  isValidWalletAddress: (address: string) => address === "valid-address",
}));
jest.mock("@/components/Overview", () => ({
  XION_TO_USDC_CONVERSION: 0.1,
}));

const mockSendTokens = jest.fn();

const setup = () =>
  render(
    <WalletSendForm
      sendTokens={mockSendTokens}
      balanceInfo={{
        total: 1000000000000,
        balances: [{ denom: "uxion", amount: "1000000000000" }],
      }}
      setIsOpen={jest.fn()}
    />,
  );

describe("WalletSendForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing", () => {
    setup();
    expect(screen.getByText("SEND")).toBeInTheDocument();
  });

  it("updates input fields correctly", async () => {
    setup();
    const amountInput = screen.getByPlaceholderText("Amount");
    const recipientInput = screen.getByTestId("recipient-input");
    const memoInput = screen.getByTestId("memo-input");

    fireEvent.change(amountInput, { target: { value: "100" } });
    fireEvent.change(recipientInput, { target: { value: "valid-address" } });
    fireEvent.change(memoInput, { target: { value: "Test Memo" } });

    expect(amountInput).toHaveValue(100);
    expect(recipientInput).toHaveValue("valid-address");
    expect(memoInput).toHaveValue("Test Memo");
  });

  it("handles sending tokens correctly", async () => {
    setup();
    const amountInput = screen.getByPlaceholderText("Amount");
    const recipientInput = screen.getByTestId("recipient-input");
    const memoInput = screen.getByTestId("memo-input");
    const reviewButton = screen.getByText("REVIEW");

    fireEvent.change(amountInput, { target: { value: "100" } });
    fireEvent.change(recipientInput, { target: { value: "valid-address" } });
    fireEvent.change(memoInput, { target: { value: "Test Memo" } });

    await act(async () => {
      await fireEvent.click(reviewButton);
    });

    const confirmButton = screen.getByText("CONFIRM");
    await act(async () => {
      await fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(mockSendTokens).toHaveBeenCalledWith(
        "valid-address",
        100,
        "Test Memo",
      );
    });
  });
});
