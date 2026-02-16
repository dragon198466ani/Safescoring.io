import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import LegalContent from "./LegalContent";

export const metadata = getSEOTags({
  title: `Legal Notice | ${config.appName}`,
  canonicalUrlRelative: "/legal",
});

export default function Legal() {
  return <LegalContent />;
}
