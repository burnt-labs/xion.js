"use client";
import { useContext, useEffect, useState } from "react";
import { useStytch } from "@stytch/nextjs";
import { WalletType, useSuggestChainAndConnect } from "graz";
import { Button, Input, ModalSection } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { testnetChainInfo } from "@burnt-labs/constants";
import { KeplrLogo } from "@burnt-labs/ui";
import { MetamaskLogo } from "@burnt-labs/ui";

export const AbstraxionSignin = () => {
  const stytchClient = useStytch();

  const { suggestAndConnect } = useSuggestChainAndConnect({
    onError: (error) => console.log("connection error: ", error),
    onSuccess: () => {
      localStorage.setItem("loginType", "graz");
      setConnectionType("graz");
    },
  });

  const [email, setEmail] = useState("");
  const [methodId, setMethodId] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isOnOtpStep, setIsOnOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { setConnectionType, setAbstraxionError } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailError("");
    setEmail(e.target.value.toLowerCase());
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtpError("");
    setOtp(e.target.value);
  };

  const EMAIL_REGEX = /\S+@\S+\.\S+/;
  const validateEmail = () => {
    if (EMAIL_REGEX.test(email) || email === "") {
      setEmailError("");
    } else {
      setEmailError("Invalid Email Format");
    }
  };

  const handleEmail = async (event: any) => {
    event.preventDefault();

    if (!email) {
      setEmailError("Please enter your email");
      return;
    }

    try {
      setConnectionType("stytch");
      const emailRes = await stytchClient.otps.email.loginOrCreate(email);
      setMethodId(emailRes.method_id);
      setIsOnOtpStep(true);
      setTimeLeft(60);
    } catch (error) {
      setEmailError("Error sending email");
      setConnectionType("none");
    }
  };

  const handleOtp = async (event: any) => {
    event.preventDefault();

    try {
      await stytchClient.otps.authenticate(otp, methodId, {
        session_duration_minutes: 60,
      });
      localStorage.setItem("loginType", "stytch");
    } catch (error) {
      setOtpError("Error verifying otp");
    }
  };

  function handleKeplr() {
    if (!window.keplr) {
      alert("Please install the Keplr wallet extension");
      return;
    }
    suggestAndConnect({
      chainInfo: testnetChainInfo,
      walletType: WalletType.KEPLR,
    });
  }

  async function handleMetamask() {
    if (!window.ethereum) {
      alert("Please install the Metamask wallet extension");
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const primaryAccount = accounts[0];
      setConnectionType("metamask");
      localStorage.setItem("loginType", "metamask");
      localStorage.setItem("loginAuthenticator", primaryAccount);
    } catch (error) {
      setAbstraxionError("Metamask connect error");
    }
  }

  // For the "resend otp" countdown
  useEffect(() => {
    if (timeLeft === 0) {
      setTimeLeft(null);
    }
    if (!timeLeft) return;
    const intervalId = setInterval(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timeLeft]);

  return (
    <ModalSection>
      {isOnOtpStep ? (
        <>
          <div className="ui-flex ui-flex-col ui-w-full ui-text-center">
            <h1 className="ui-w-full ui-leading-[38.40px] ui-tracking-tighter ui-text-3xl ui-font-light ui-text-white ui-uppercase ui-mb-3">
              Input 6 digit code
            </h1>
            <h2 className="ui-w-full ui-mb-4 ui-text-center ui-text-sm ui-font-normal ui-leading-tight ui-text-white/50">
              Please check your email for the verification code
            </h2>
          </div>
          <Input
            placeholder="Verification Code"
            value={otp}
            onChange={handleOtpChange}
            error={otpError}
          />
          <div className="ui-flex ui-w-full ui-flex-col ui-items-center ui-gap-4">
            <Button fullWidth={true} onClick={handleOtp} disabled={!!otpError}>
              Confirm
            </Button>
            <Button
              structure="outlined"
              fullWidth={true}
              onClick={handleEmail}
              disabled={!!timeLeft}
            >
              Resend Code {timeLeft && `in ${timeLeft} seconds`}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="ui-flex ui-flex-col ui-w-full ui-text-center ui-font-akkuratLL">
            <h1 className="ui-w-full ui-leading-[38.40px] ui-tracking-tighter ui-text-3xl ui-font-light ui-text-white ui-uppercase ui-mb-3">
              Welcome
            </h1>
            <h2 className="ui-w-full ui-mb-4 ui-text-center ui-text-sm ui-font-normal ui-leading-tight ui-text-white/50">
              Log in or sign up with your email
            </h2>
          </div>
          <Input
            placeholder="Email address"
            value={email}
            onChange={handleEmailChange}
            error={emailError}
            onBlur={validateEmail}
          />
          <Button
            fullWidth={true}
            onClick={handleEmail}
            disabled={!!emailError}
          >
            Log in / Sign up
          </Button>
          <button
            className="ui-text-white ui-text-sm ui-underline ui-w-full"
            onClick={() => setShowAdvanced((showAdvanced) => !showAdvanced)}
          >
            Advanced Options
          </button>
          {showAdvanced ? (
            <div className="ui-flex ui-w-full ui-gap-2">
              <Button
                fullWidth={true}
                onClick={handleKeplr}
                structure="outlined"
              >
                <KeplrLogo />
              </Button>
              <Button
                fullWidth={true}
                onClick={handleMetamask}
                structure="outlined"
              >
                <MetamaskLogo />
              </Button>
            </div>
          ) : null}
        </>
      )}
    </ModalSection>
  );
};
