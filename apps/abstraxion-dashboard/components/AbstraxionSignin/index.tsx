"use client";
import { useContext, useEffect, useState } from "react";
import { WalletType, useSuggestChainAndConnect } from "graz";
import { useStytch } from "@stytch/nextjs";
import { Button, Input, ModalSection } from "@burnt-labs/ui";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";

export const AbstraxionSignin = () => {
  const stytchClient = useStytch();

  const [email, setEmail] = useState("");
  const [methodId, setMethodId] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isOnOtpStep, setIsOnOtpStep] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const { setConnectionType } = useContext(
    AbstraxionContext,
  ) as AbstraxionContextProps;

  const { suggestAndConnect } = useSuggestChainAndConnect({
    onError(error) {
      setConnectionType("none");
      if ((error as Error).message.includes("is not defined")) {
        alert(
          "Wallet not found. Make sure you download the wallet extension before trying again.",
        );
      }
    },
  });

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
    } catch (error) {
      setOtpError("Error verifying otp");
    }
  };

  async function handleWebauthnAuthenticate() {
    try {
      await stytchClient.webauthn.authenticate({
        domain: window.location.hostname,
        session_duration_minutes: 60,
      });
    } catch (error) {
      console.log(error);
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
            <h1 className="ui-w-full ui-tracking-tighter ui-text-3xl ui-font-bold ui-text-white ui-uppercase ui-mb-3">
              Input 6 digit code
            </h1>
            <h2 className="ui-w-full ui-tracking-tighter ui-text-sm ui-mb-4 ui-text-neutral-500">
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
          <div className="ui-flex ui-flex-col ui-w-full ui-text-center">
            <h1 className="ui-w-full ui-tracking-tighter ui-text-3xl ui-font-bold ui-text-white ui-uppercase ui-mb-3">
              Welcome
            </h1>
            <h2 className="ui-w-full ui-tracking-tighter ui-text-sm ui-mb-4 ui-text-neutral-500">
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
          <div className="ui-flex ui-w-full ui-gap-1">
            <Button
              fullWidth={true}
              onClick={handleEmail}
              disabled={!!emailError}
            >
              Log in / Sign up
            </Button>
            <Button structure="outlined" onClick={handleWebauthnAuthenticate}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ui-w-4 ui-h-4"
              >
                <path d="M2 12C2 6.5 6.5 2 12 2a10 10 0 0 1 8 4" />
                <path d="M5 19.5C5.5 18 6 15 6 12c0-.7.12-1.37.34-2" />
                <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
                <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
                <path d="M8.65 22c.21-.66.45-1.32.57-2" />
                <path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
                <path d="M2 16h.01" />
                <path d="M21.8 16c.2-2 .131-5.354 0-6" />
                <path d="M9 6.8a6 6 0 0 1 9 5.2c0 .47 0 1.17-.02 2" />
              </svg>
            </Button>
          </div>
          <p className="ui-text-xs ui-text-neutral-500">
            By continuing, you agree to Burnt&apos;s{" "}
            <a
              className="ui-text-white ui-no-underline hover:ui-underline"
              href="https://burnt.com"
            >
              Terms of Service
            </a>{" "}
            and acknowledge that you have read and understand the XION{" "}
            <a
              className="ui-text-white ui-no-underline hover:ui-underline"
              href="https://burnt.com"
            >
              Disclaimer
            </a>
            .
          </p>
        </>
      )}
    </ModalSection>
  );
};
