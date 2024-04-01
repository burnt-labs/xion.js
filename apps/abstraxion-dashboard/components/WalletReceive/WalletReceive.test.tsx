import { render, screen, act } from "@testing-library/react";
import { WalletReceive } from ".";

describe("WalletReceive", () => {
  it("should render the WalletReceive modal when the trigger is clicked", async () => {
    render(
      <WalletReceive trigger={<div>Trigger</div>} xionAddress="xionAddress" />,
    );
    const button = screen.getByText("Trigger");
    await act(async () => {
      await button.click();
    });

    const walletReceive = screen.getByText("RECEIVE");
    expect(walletReceive).toBeInTheDocument();
  });

  it("should format and render the xion address", async () => {
    render(
      <WalletReceive
        trigger={<div>Trigger</div>}
        xionAddress="mockXionAddress"
      />,
    );
    const button = screen.getByText("Trigger");
    await act(async () => {
      await button.click();
    });

    const truncatedXionAddress = screen.getByText("mockXion...ress");
    expect(truncatedXionAddress).toBeInTheDocument();
  });
});
