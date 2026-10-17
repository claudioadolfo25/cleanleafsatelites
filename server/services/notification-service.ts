import { getUserPreferencesDb } from "../db/repository";

export type NotificationType = "analysis_completed" | "analysis_failed" | "new_alert";

export async function sendEmailNotification(
  userId: string,
  userEmail: string | undefined | null,
  type: NotificationType,
  subject: string,
  bodyText: string,
  accessToken?: string
): Promise<{ sent: boolean; reason?: string }> {
  if (!userEmail) {
    return { sent: false, reason: "No email address available" };
  }

  // Check user preferences for opt-out
  const prefs = await getUserPreferencesDb(userId, accessToken);

  if (prefs) {
    const rawPrefs = prefs as any;
    if (type === "analysis_completed" && rawPrefs.notify_email_completed === false) {
      return { sent: false, reason: "User opted out of analysis_completed notifications" };
    }
    if (type === "analysis_failed" && rawPrefs.notify_email_failed === false) {
      return { sent: false, reason: "User opted out of analysis_failed notifications" };
    }
    if (type === "new_alert" && rawPrefs.notify_email_alert === false) {
      return { sent: false, reason: "User opted out of new_alert notifications" };
    }
  }

  // Simulated email dispatch log (or integration with Resend / SMTP service)
  console.log(`[NotificationService] Sending email to ${userEmail}: [${subject}]`);
  return { sent: true };
}
