import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import PrivacyPolicyContent from "./PrivacyPolicyContent";

export const metadata = getSEOTags({
  title: `Privacy Policy | ${config.appName}`,
  canonicalUrlRelative: "/privacy-policy",
});

export default function PrivacyPolicy() {
  return <PrivacyPolicyContent />;
}
