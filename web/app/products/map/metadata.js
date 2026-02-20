import { getSEOTags } from "@/libs/seo";
import config from "@/config";

export const metadata = getSEOTags({
  title: `Global Products Map | ${config.appName}`,
  description: "Explore crypto products worldwide. See where products are created, where they're headquartered, and in which countries they can be legally used.",
  canonicalUrlRelative: "/products/map",
});

export default function Layout({ children }) {
  return children;
}
