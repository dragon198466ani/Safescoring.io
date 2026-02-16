import { getSEOTags } from "@/libs/seo";
import config from "@/config";
import TosContent from "./TosContent";

export const metadata = getSEOTags({
  title: `Terms and Conditions | ${config.appName}`,
  canonicalUrlRelative: "/tos",
});

export default function TOS() {
  return <TosContent />;
}
