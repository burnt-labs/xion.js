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

export const AbstraxionSignin = () => {
  const stytchClient = useStytch();

  const { suggestAndConnect } = useSuggestChainAndConnect({
    onError: (error) => console.log("connection error: ", error),
    onSuccess: () => {
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

  const { setConnectionType } = useContext(
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
    } catch (error) {
      setOtpError("Error verifying otp");
    }
  };

  function handleKeplr() {
    suggestAndConnect({
      chainInfo: testnetChainInfo,
      walletType: WalletType.KEPLR,
    });
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
          <Button
            className="ui-rounded-md ui-font-akkuratLL ui-uppercase ui-px-5 ui-py-3.5 ui-text-sm ui-outline-none ui-hover:opacity-70 ui-border ui-bg-transparent ui-border-neutral-300 ui-text-white hover:ui-bg-white/5 ui-flex ui-items-center ui-justify-center ui-gap-2 ui-w-full"
            onClick={handleKeplr}
            structure="outlined"
          >
            <KeplrLogo />
            Keplr
          </Button>
        </>
      )}
    </ModalSection>
  );
};
