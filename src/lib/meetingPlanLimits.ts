import type { RegalPlanId } from '@/lib/regalPlans';
import { SFU_AUTO_THRESHOLD } from '@/lib/meetingTopology';

export type MeetingPlanLimits = {
  maxParticipants: number;
  /** Max single-session duration in minutes; null = no hard cap */
  maxDurationMinutes: number | null;
  hdVideo: boolean;
  maxVideoHeight: number;
  /** Cloudflare SFU for large participant rooms */
  sfuEnabled: boolean;
  screenShare: boolean;
  recording: boolean;
};

/** Per-plan meeting limits — aligned with Regal Cloud entitlements. */
const LIMITS: Record<RegalPlanId, MeetingPlanLimits> = {
  free: {
    maxParticipants: 110,
    maxDurationMinutes: 60,
    hdVideo: false,
    maxVideoHeight: 720,
    sfuEnabled: false,
    screenShare: true,
    recording: false,
  },
  pro: {
    maxParticipants: 200,
    maxDurationMinutes: 8 * 60,
    hdVideo: true,
    maxVideoHeight: 720,
    sfuEnabled: true,
    screenShare: true,
    recording: true,
  },
  business_education: {
    maxParticipants: 300,
    maxDurationMinutes: 8 * 60,
    hdVideo: true,
    maxVideoHeight: 1080,
    sfuEnabled: true,
    screenShare: true,
    recording: true,
  },
  vault_plus: {
    maxParticipants: 500,
    maxDurationMinutes: 24 * 60,
    hdVideo: true,
    maxVideoHeight: 1080,
    sfuEnabled: true,
    screenShare: true,
    recording: true,
  },
  ultra: {
    maxParticipants: 500,
    maxDurationMinutes: 24 * 60,
    hdVideo: true,
    maxVideoHeight: 1080,
    sfuEnabled: true,
    screenShare: true,
    recording: true,
  },
  business_corporate: {
    maxParticipants: 500,
    maxDurationMinutes: 24 * 60,
    hdVideo: true,
    maxVideoHeight: 1080,
    sfuEnabled: true,
    screenShare: true,
    recording: true,
  },
  team: {
    maxParticipants: 500,
    maxDurationMinutes: 24 * 60,
    hdVideo: true,
    maxVideoHeight: 1080,
    sfuEnabled: true,
    screenShare: true,
    recording: true,
  },
};

export function meetingLimitsForPlan(plan: RegalPlanId): MeetingPlanLimits {
  return LIMITS[plan] ?? LIMITS.free;
}

export function sfuThresholdForPlan(plan: RegalPlanId): number {
  const limits = meetingLimitsForPlan(plan);
  return limits.sfuEnabled ? SFU_AUTO_THRESHOLD : Number.POSITIVE_INFINITY;
}

export function formatDurationLimit(minutes: number | null): string {
  if (minutes == null) return 'Unlimited';
  if (minutes < 60) return `${minutes} minutes`;
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
