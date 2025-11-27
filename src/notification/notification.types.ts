export const NOTIFICATION_AUDIENCES = ['admin', 'user'] as const;
export type NotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];

export const NOTIFICATION_STATUS = ['unread', 'read'] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUS)[number];

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high'] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];

export const NOTIFICATION_TYPES = [
  'testimony_submitted',
  'feedback_resolved',
  'ai_connection',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface CreateNotificationInput {
  title: string;
  message?: string;
  type: NotificationType | string;
  audience?: NotificationAudience;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
  userId?: number;
}
