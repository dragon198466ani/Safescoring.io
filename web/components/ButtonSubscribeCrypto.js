"use client";

import { useState, useEffect } from "react";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import toast from "react-hot-toast";
import {
  getSuperfluidAddresses,
  SUBSCRIPTION_PRICES,
  monthlyToFlowRate,
  flowRateToMonthly,
  SUPER_TOKEN_ABI,
  CFA_V1_ABI,
  TREASURY_ADDRESS,
} from "@/libs/superfluid";
import { ERC20_ABI } from "@/libs/contracts";

/**
 * Button for USDC streaming subscription via Superfluid
 * User pays continuously per second, can cancel anytime
 */
export default function ButtonSubscribeCrypto({
  plan = "explorer", // explorer | professional | enterprise
  className = "",
  onSuccess,
}) {
  const { address, isConnected, chain } = useAccount();
  const [step, setStep] = useState("idle"); // idle, approving, upgrading, streaming, success
  const [hasActiveStream, setHasActiveStream] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [_usdcxBalance, setUsdcxBalance] = useState("0");

  const addresses = getSuperfluidAddresses(chain?.id);
  const monthlyPrice = SUBSCRIPTION_PRICES[plan] || 19;
  const flowRate = monthlyToFlowRate(monthlyPrice);

  // Contract writes
  const { writeContract: approveUSDC, data: approveHash } = useWriteContract();
  const { writeContract: upgradeToUSDCx, data: upgradeHash } = useWriteContract();
  const { writeContract: createStream, data: streamHash } = useWriteContract();
  const { writeContract: deleteStream, data: deleteHash } = useWriteContract();

  // Transaction receipts
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: upgradeSuccess } = useWaitForTransactionReceipt({ hash: upgradeHash });
  const { isSuccess: streamSuccess } = useWaitForTransactionReceipt({ hash: streamHash });
  const { isSuccess: deleteSuccess } = useWaitForTransactionReceipt({ hash: deleteHash });

  // Read USDC balance
  const { data: usdcBalanceData } = useReadContract({
    address: addresses?.usdc,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address && !!addresses?.usdc,
  });

  // Read USDCx balance
  const { data: usdcxBalanceData } = useReadContract({
    address: addresses?.usdcx,
    abi: SUPER_TOKEN_ABI,
    functionName: "balanceOf",
    args: [address],
    enabled: !!address && !!addresses?.usdcx,
  });

  // Check existing stream
  const { data: existingStream } = useReadContract({
    address: addresses?.cfaV1,
    abi: CFA_V1_ABI,
    functionName: "getFlow",
    args: [addresses?.usdcx, address, TREASURY_ADDRESS],
    enabled: !!address && !!addresses?.cfaV1,
  });

  useEffect(() => {
    if (usdcBalanceData) {
      setUsdcBalance(formatUnits(usdcBalanceData, 6));
    }
  }, [usdcBalanceData]);

  useEffect(() => {
    if (usdcxBalanceData) {
      setUsdcxBalance(formatUnits(usdcxBalanceData, 18));
    }
  }, [usdcxBalanceData]);

  useEffect(() => {
    if (existingStream && existingStream[1] > 0) {
      setHasActiveStream(true);
    }
  }, [existingStream]);

  // Handle transaction successes
  useEffect(() => {
    if (approveSuccess && step === "approving") {
      toast.success("USDC approved!");
      handleUpgrade();
    }
  }, [approveSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (upgradeSuccess && step === "upgrading") {
      toast.success("USDC wrapped to USDCx!");
      handleCreateStream();
    }
  }, [upgradeSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (streamSuccess && step === "streaming") {
      toast.success("Subscription started!");
      setStep("success");
      setHasActiveStream(true);
      onSuccess?.();
    }
  }, [streamSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (deleteSuccess) {
      toast.success("Subscription cancelled");
      setHasActiveStream(false);
      setStep("idle");
    }
  }, [deleteSuccess]);

  // Step 1: Approve USDC spending
  const handleApprove = async () => {
    setStep("approving");
    try {
      // Approve 3 months worth for buffer
      const approveAmount = parseUnits((monthlyPrice * 3).toString(), 6);
      approveUSDC({
        address: addresses.usdc,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [addresses.usdcx, approveAmount],
      });
    } catch (error) {
      console.error("Approve error:", error);
      toast.error("Approval failed");
      setStep("idle");
    }
  };

  // Step 2: Wrap USDC to USDCx (Super Token)
  const handleUpgrade = async () => {
    setStep("upgrading");
    try {
      // Wrap 1 month worth
      const upgradeAmount = parseUnits(monthlyPrice.toString(), 6);
      upgradeToUSDCx({
        address: addresses.usdcx,
        abi: SUPER_TOKEN_ABI,
        functionName: "upgrade",
        args: [upgradeAmount],
      });
    } catch (error) {
      console.error("Upgrade error:", error);
      toast.error("Wrapping failed");
      setStep("idle");
    }
  };

  // Step 3: Create the payment stream
  const handleCreateStream = async () => {
    setStep("streaming");
    try {
      // Use CFAv1Forwarder for easier stream creation
      createStream({
        address: addresses.host,
        abi: [
          {
            inputs: [
              { name: "token", type: "address" },
              { name: "receiver", type: "address" },
              { name: "flowRate", type: "int96" },
              { name: "userData", type: "bytes" },
            ],
            name: "createFlow",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "createFlow",
        args: [addresses.usdcx, TREASURY_ADDRESS, flowRate, "0x"],
      });
    } catch (error) {
      console.error("Stream error:", error);
      toast.error("Stream creation failed");
      setStep("idle");
    }
  };

  // Cancel subscription
  const handleCancel = async () => {
    try {
      deleteStream({
        address: addresses.host,
        abi: [
          {
            inputs: [
              { name: "token", type: "address" },
              { name: "sender", type: "address" },
              { name: "receiver", type: "address" },
              { name: "userData", type: "bytes" },
            ],
            name: "deleteFlow",
            outputs: [{ name: "", type: "bool" }],
            stateMutability: "nonpayable",
            type: "function",
          },
        ],
        functionName: "deleteFlow",
        args: [addresses.usdcx, address, TREASURY_ADDRESS, "0x"],
      });
    } catch (error) {
      console.error("Cancel error:", error);
      toast.error("Cancellation failed");
    }
  };

  // Not connected
  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button onClick={openConnectModal} className={`btn btn-primary ${className}`}>
            Connect Wallet
          </button>
        )}
      </ConnectButton.Custom>
    );
  }

  // Already subscribed
  if (hasActiveStream) {
    const currentMonthly = existingStream ? flowRateToMonthly(existingStream[1]) : monthlyPrice;
    return (
      <div className="flex flex-col gap-2">
        <div className="badge badge-success gap-2">
          <span className="loading loading-ring loading-xs"></span>
          Streaming ${currentMonthly}/month
        </div>
        <button onClick={handleCancel} className={`btn btn-outline btn-error btn-sm ${className}`}>
          Cancel Subscription
        </button>
      </div>
    );
  }

  // Insufficient balance
  if (parseFloat(usdcBalance) < monthlyPrice) {
    return (
      <button className={`btn btn-disabled ${className}`} disabled>
        Need ${monthlyPrice} USDC (have ${parseFloat(usdcBalance).toFixed(2)})
      </button>
    );
  }

  // In progress states
  const isLoading = ["approving", "upgrading", "streaming"].includes(step);
  const buttonText = {
    idle: `Subscribe $${monthlyPrice}/month`,
    approving: "Approving USDC...",
    upgrading: "Wrapping to USDCx...",
    streaming: "Starting stream...",
    success: "Subscribed!",
  };

  return (
    <button
      onClick={handleApprove}
      disabled={isLoading}
      className={`btn btn-primary ${className}`}
    >
      {isLoading && <span className="loading loading-spinner loading-sm"></span>}
      {buttonText[step]}
    </button>
  );
}
