/**
 * Time formatting utilities
 * Shared across the application for consistent time display
 */

/**
 * Format a Date as HH:MM
 */
export function formatTime(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Format a Date as HH:MM:SS
 */
export function formatTimeWithSeconds(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

/**
 * Format a Date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format a Date as "HH:MM, Jan 8"
 */
export function formatDateTime(date: Date): string {
  const time = formatTime(date);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${time}, ${month} ${day}`;
}

/**
 * Format duration in minutes as a human-readable string
 */
export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format seconds as a human-readable duration
 */
export function formatDurationSeconds(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  return formatDurationMinutes(minutes);
}

/**
 * Format seconds as a countdown string (MM:SS or H:MM:SS)
 */
export function formatCountdown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;

  const mm = minutes.toString().padStart(2, "0");
  const ss = remainingSeconds.toString().padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

/**
 * Get a relative time string (e.g., "2 min ago", "in 5 min")
 */
export function getRelativeTime(date: Date, now: Date = new Date()): string {
  const diffMs = date.getTime() - now.getTime();
  const diffSeconds = Math.floor(Math.abs(diffMs) / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);

  const isPast = diffMs < 0;

  if (diffSeconds < 60) {
    return isPast ? "just now" : "now";
  }

  if (diffMinutes < 60) {
    const label = `${diffMinutes} min`;
    return isPast ? `${label} ago` : `in ${label}`;
  }

  if (diffHours < 24) {
    const mins = diffMinutes % 60;
    const label = mins > 0 ? `${diffHours}h ${mins}m` : `${diffHours}h`;
    return isPast ? `${label} ago` : `in ${label}`;
  }

  // More than a day, just show the date/time
  return formatDateTime(date);
}

/**
 * Check if a date is today
 */
export function isToday(date: Date, now: Date = new Date()): boolean {
  return (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  );
}

/**
 * Get the start of day for a date
 */
export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

/**
 * Get the end of day for a date
 */
export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/**
 * Add seconds to a date
 */
export function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

/**
 * Calculate the difference in minutes between two dates
 */
export function diffMinutes(a: Date, b: Date): number {
  return Math.floor((a.getTime() - b.getTime()) / 60000);
}

/**
 * Format "last updated" timestamp
 */
export function formatLastUpdated(date: Date, now: Date = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 10) {
    return "just now";
  }

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }

  // More than an hour, show the time
  return `at ${formatTime(date)}`;
}

