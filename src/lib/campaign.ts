/**
 * Day 1 of the 30-day campaign: 20 October 2026, 10:00 UK time.
 * UK is on BST (UTC+1) on that date, so this is 09:00 UTC.
 * Can be overridden with the CAMPAIGN_START_UTC environment variable.
 */
export const CAMPAIGN_START_UTC = "2026-10-20T09:00:00Z";

export function formatUk(iso: string): string {
  return (
    new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Europe/London",
    }).format(new Date(iso)) + " UK time"
  );
}