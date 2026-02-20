import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";
import {
  initiateCancellationFlow,
  submitCancelReason,
  acceptRetentionOffer,
  rejectRetentionOffer,
  downgradePlan,
  pauseSubscription,
  completeCancellation,
} from "@/libs/cancellation-flow";

/**
 * POST /api/subscription/cancel
 * Handle cancellation flow steps
 */
export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { action, flowId, ...data } = body;

    let result;

    switch (action) {
      case "initiate":
        // Start cancellation flow
        result = await initiateCancellationFlow(userId);
        break;

      case "submit_reason":
        // Submit reason and get offer
        if (!flowId || !data.reason) {
          return NextResponse.json(
            { error: "Flow ID and reason are required" },
            { status: 400 }
          );
        }
        result = await submitCancelReason(flowId, userId, data.reason, data.detail);
        break;

      case "accept_offer":
        // Accept retention offer
        if (!flowId) {
          return NextResponse.json({ error: "Flow ID required" }, { status: 400 });
        }
        result = await acceptRetentionOffer(flowId, userId);
        break;

      case "reject_offer":
        // Reject offer, show alternatives
        if (!flowId) {
          return NextResponse.json({ error: "Flow ID required" }, { status: 400 });
        }
        result = await rejectRetentionOffer(flowId, userId);
        break;

      case "downgrade":
        // Downgrade to lower plan
        if (!flowId || !data.targetPlan) {
          return NextResponse.json(
            { error: "Flow ID and target plan required" },
            { status: 400 }
          );
        }
        result = await downgradePlan(flowId, userId, data.targetPlan);
        break;

      case "pause":
        // Pause subscription
        if (!flowId) {
          return NextResponse.json({ error: "Flow ID required" }, { status: 400 });
        }
        result = await pauseSubscription(flowId, userId, data.months || 1);
        break;

      case "complete":
        // Complete cancellation
        if (!flowId) {
          return NextResponse.json({ error: "Flow ID required" }, { status: 400 });
        }
        result = await completeCancellation(flowId, userId);
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cancellation flow error:", error);
    return NextResponse.json(
      { error: error.message || "Cancellation flow failed" },
      { status: 500 }
    );
  }
}
