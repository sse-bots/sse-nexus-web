export type KeyScope = "single" | "bundle" | "global";

export interface BotDocument {
  _id?: string;
  name: string;
  discord_bot_id: string;
  activation_id: string;
  description?: string;
  invite_url?: string;
  activation_required: boolean;
  maintenance_mode?: boolean;
  heartbeat_status?: "online" | "offline" | "unknown";
  heartbeat_last_seen?: string | Date | null;
  status: "active" | "removed";
  created_by?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

export interface ActivationRequestDoc {
  _id: string;
  key_scope?: KeyScope;
  bot_activation_id: string; // For global: "__GLOBAL__"; for bundle: first bot or "__BUNDLE__"
  bot_activation_ids?: string[];
  bot_name: string;
  bot_names?: string[];
  guild_id: string;
  guild_name: string;
  requester_id: string;
  status: "pending" | "approved" | "rejected" | "delivery_failed" | "cancelled";
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  approval_reason?: string;
  rejected_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  key_id?: string;
  key_status?: "unused" | "used" | "revoked";
  plaintext_key?: string | null; // Decrypted server-side ONLY for owner while key is unused
  source?: "discord" | "web";
  licensed_owner_role_assignment?: {
    status: string;
    error?: string;
  };
}

export interface DiscordGuildSummary {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  canManage: boolean;
  nexusPresent: boolean;
  activeBotCount: number;
  pendingRequestCount: number;
  readyKeyCount: number;
}
