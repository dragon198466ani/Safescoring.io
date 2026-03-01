import Link from "next/link";
import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Terms of Sale — CGV | ${config.appName}`,
  canonicalUrlRelative: "/cgv",
});

const CGV = () => {
  return (
    <main className="max-w-xl mx-auto">
      <div className="p-5">
        <Link href="/" className="btn btn-ghost">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="w-5 h-5"
          >
            <path
              fillRule="evenodd"
              d="M15 10a.75.75 0 01-.75.75H7.612l2.158 1.96a.75.75 0 11-1.04 1.08l-3.5-3.25a.75.75 0 010-1.08l3.5-3.25a.75.75 0 111.04 1.08L7.612 9.25h6.638A.75.75 0 0115 10z"
              clipRule="evenodd"
            />
          </svg>
          Back
        </Link>
        <h1 className="text-3xl font-extrabold pb-6">
          Terms of Sale — Conditions Générales de Vente (CGV)
        </h1>

        <pre
          className="leading-relaxed whitespace-pre-wrap"
          style={{ fontFamily: "sans-serif" }}
        >
          {`Last Updated: March 2, 2026

These Terms of Sale ("CGV") govern all purchases of paid subscription plans on SafeScoring (https://safescoring.io), operated by SafeScoring LLC. They complement the general Terms of Service (/tos).

By subscribing to a paid plan, you acknowledge that you have read, understood, and accepted these Terms of Sale.


1. SELLER IDENTIFICATION

SafeScoring LLC
30 N Gould St, Ste R
Sheridan, WY 82801, United States
Email: support@safescoring.io

Merchant of Record:
Lemon Squeezy LLC
222 S Main St #500, Salt Lake City, UT 84101, USA


2. SERVICES OFFERED

SafeScoring offers the following subscription plans:

2.1 Free Plan (EUR 0/month)
— Browse all product security scores
— 1 custom setup analysis (max 3 products)
— 1 custom scoring weight profile
— Updated monthly

2.2 Explorer Plan (EUR 19/month or EUR 190/year)
— Unlimited product comparisons
— 5 setup analyses (max 5 products each)
— 3 custom scoring weight profiles
— Side-by-side product comparison
— Email support

2.3 Professional Plan (EUR 49/month or EUR 490/year)
— Everything in Explorer
— 20 setup analyses (max 10 products each)
— Detailed risk breakdown per setup
— Score change tracking over time
— API access for integrations
— Priority support

2.4 Enterprise Plan (EUR 299/month)
— Everything in Professional
— Unlimited setups and products
— Team sharing and collaboration
— Unlimited scoring weight profiles
— PDF report exports
— Dedicated account manager

Prices are displayed inclusive of applicable taxes. VAT is handled by Lemon Squeezy as Merchant of Record.


3. ORDERING PROCESS

3.1 To subscribe, you must:
— Create a SafeScoring account
— Select a subscription plan
— Provide valid payment information
— Confirm your order

3.2 Your subscription begins immediately upon successful payment.

3.3 An order confirmation is sent to your registered email address.


4. PRICING AND PAYMENT

4.1 Prices are displayed in USD and may be converted to your local currency by your payment provider.

4.2 Accepted payment methods:
— Credit/debit card (Visa, Mastercard, American Express) via Lemon Squeezy
— Cryptocurrency (BTC, ETH, USDC) where available

4.3 Subscriptions are billed:
— Monthly: on the same date each month
— Annual: on the same date each year

4.4 All prices may be subject to change with 30 days prior notice to existing subscribers.


5. FREE TRIAL

5.1 Paid plans include a 14-day free trial period.

5.2 During the trial, you have full access to the plan's features.

5.3 If you do not cancel before the end of the trial period, your subscription will automatically convert to a paid subscription and your payment method will be charged.

5.4 You may cancel the trial at any time without charge via your account dashboard.


6. RIGHT OF WITHDRAWAL (EU Consumer Rights Directive 2011/83/EU)

6.1 In accordance with EU Consumer Rights Directive and Article L221-18 of the French Consumer Code (Code de la consommation), you have the right to withdraw from your purchase within 14 calendar days from the date of subscription, without giving any reason.

6.2 To exercise your right of withdrawal, you must inform us by a clear statement:
— Email: support@safescoring.io
— Subject: "Right of Withdrawal — [Your Email]"

6.3 If you have used the service during the withdrawal period, you may be charged a proportional amount for the service received.

6.4 Refunds will be processed within 14 days of receiving your withdrawal request, using the same payment method as the original transaction.

6.5 Model withdrawal form (Annex I to Directive 2011/83/EU):
"I hereby give notice that I withdraw from my contract for the provision of the following service: SafeScoring [Plan Name] subscription, ordered on [date], Name: [your name], Email: [your email], Date: [today's date], Signature (if paper form)."


7. CANCELLATION AND REFUND

7.1 You may cancel your subscription at any time through:
— Your account dashboard (/dashboard)
— Email to support@safescoring.io
— Lemon Squeezy customer portal

7.2 Upon cancellation:
— You retain access to your plan features until the end of the current billing period
— No further charges will be made
— Your account reverts to the Free plan

7.3 Refund policy:
— Within 14 days of purchase: Full refund (EU right of withdrawal)
— After 14 days: No pro-rata refund for the remaining period
— Annual plans: Refund of unused months if cancelled within 30 days


8. SERVICE AVAILABILITY

8.1 SafeScoring aims for 99.9% uptime but does not guarantee uninterrupted service.

8.2 Planned maintenance will be communicated in advance when possible.

8.3 Force majeure events (including blockchain network outages, regulatory changes, and natural disasters) may affect service availability. No compensation is owed for interruptions caused by force majeure.


9. LIABILITY

9.1 SafeScoring provides security scores for informational purposes only.

9.2 SafeScoring shall not be held liable for:
— Investment decisions made based on our scores
— Financial losses related to cryptocurrency investments
— Temporary service interruptions
— Actions of third-party payment processors

9.3 Maximum liability: In all cases, SafeScoring's total liability shall not exceed the amount paid by the user in the 12 months preceding the claim.


10. PERSONAL DATA

Personal data collected during the purchase process is handled in accordance with our Privacy Policy (/privacy). See also our Cookie Policy (/cookies).


11. CONSUMER MEDIATION (EU/France)

In accordance with Article L612-1 of the French Consumer Code, in the event of a dispute that cannot be resolved directly with our support team, you have the right to use a consumer mediator free of charge.

Online Dispute Resolution (ODR) platform:
https://ec.europa.eu/consumers/odr

You may also contact your national consumer protection authority.


12. APPLICABLE LAW AND JURISDICTION

12.1 These Terms of Sale are governed by:
— The laws of the European Union (Directive 2011/83/EU, Regulation (EU) 2016/679)
— French consumer protection law (Code de la consommation)
— The laws of the State of Wyoming, United States

12.2 In case of dispute, mandatory consumer protection laws of your country of residence shall apply where they provide greater protection.

12.3 For EU consumers, the competent court is the court of the consumer's place of residence.


13. CONTACT

For any questions regarding these Terms of Sale:
Email: support@safescoring.io
Response time: Within 48 hours (business days)


© ${new Date().getFullYear()} SafeScoring LLC. All rights reserved.`}
        </pre>
      </div>
    </main>
  );
};

export default CGV;
