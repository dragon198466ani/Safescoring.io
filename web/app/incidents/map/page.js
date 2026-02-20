import { redirect } from "next/navigation";

/**
 * Redirect /incidents/map to /map (where the actual map is)
 * This ensures old links and SEO don't break
 */
export default function IncidentsMapRedirect() {
  redirect("/map");
}
