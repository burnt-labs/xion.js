"use client";
import { useContext, useEffect, useState } from "react";
import { WalletType, useSuggestChainAndConnect } from "graz";
import { useStytch } from "@stytch/nextjs";
import {
  AbstraxionContext,
  AbstraxionContextProps,
} from "../AbstraxionContext";
import { testnetChainInfo } from "@burnt-labs/constants/chain";
import {
  Button,
  Input,
  ModalSection,
  ChevronDown,
  PinInput,
} from "@burnt-labs/ui";

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

  const handleConnect = (wallet: WalletType) => {
    setConnectionType("graz");
    suggestAndConnect({ chainInfo: testnetChainInfo, walletType: wallet });
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
          <div className="ui-text-black dark:ui-text-white">
            <h1 className="ui-mb-3 ui-text-2xl ui-font-bold ui-tracking-tighter">
              Input 6 Digit Code
            </h1>
            <h2 className="ui-mb-3">
              Please check your email for the verification code.
            </h2>
          </div>
          <PinInput
            length={6}
            onComplete={(value) => {
              setOtp(value);
            }}
            error={otpError}
            setError={setOtpError}
          />
          <div className="ui-flex ui-w-full ui-flex-col ui-items-center ui-gap-4">
            <Button
              structure="base"
              theme="primary"
              fullWidth={true}
              onClick={handleOtp}
            >
              Confirm
            </Button>
            <Button
              structure="outlined"
              theme="primary"
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
          <h1 className="ui-w-full ui-tracking-tighter ui-text-2xl ui-font-bold ui-mb-4 ui-text-black dark:ui-text-white">
            Welcome to XION
          </h1>
          <Input
            placeholder="Email address"
            fullWidth={true}
            value={email}
            onChange={handleEmailChange}
            error={emailError}
            onBlur={validateEmail}
          />
          <Button
            structure="base"
            theme="primary"
            fullWidth={true}
            onClick={handleEmail}
            disabled={!!emailError}
          >
            Log in / Sign up
          </Button>
          <div className="ui-flex ui-items-center ui-w-full">
            <div className="ui-border-b ui-border-zinc-300 ui-grow" />
            <span className="ui-text-black ui-font-semibold dark:ui-text-white ui-shrink ui-px-3">
              OR
            </span>
            <div className="ui-border-b ui-border-zinc-300 ui-grow" />
          </div>
          <div className="ui-flex ui-w-full ui-flex-col ui-items-center ui-gap-4">
            <Button
              structure="outlined"
              theme="primary"
              fullWidth={true}
              onClick={handleWebauthnAuthenticate}
            >
              Passkey/Biometrics
            </Button>
          </div>
          <p className="ui-text-xs ui-text-zinc-400 dark:ui-text-zinc-600">
            By continuing, you agree to Burnt's{" "}
            <a
              className="ui-text-black dark:ui-text-white ui-no-underline hover:ui-underline"
              href="https://burnt.com"
            >
              Terms of Service
            </a>{" "}
            and acknowledge that you have read and understand the XION{" "}
            <a
              className="ui-text-black dark:ui-text-white ui-no-underline hover:ui-underline"
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
