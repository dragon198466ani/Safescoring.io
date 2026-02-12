import { auth } from "@/libs/auth";
import NotificationPreferences from "@/components/NotificationPreferences";
import AchievementBadges from "@/components/AchievementBadges";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Notifications & Settings | SafeScoring",
};

export default async function NotificationsPage() {
  const session = await auth();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Notifications & Settings</h1>
        <p className="text-base-content/60 mt-1">
          Manage your alerts, email preferences, and view achievements
        </p>
      </div>

      {/* Notification Preferences */}
      <NotificationPreferences />

      {/* Achievements */}
      <AchievementBadges showAll={true} />
    </div>
  );
}
