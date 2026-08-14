import { Client } from 'discord.js';
import { logger } from '../telemetry/logger';
import fs from 'fs';
import path from 'path';

export type ProfileType = string;

interface AssetState {
  avatar: string;
  banner: string | null;
}

interface IdentityRegistry {
  states: Record<string, AssetState>;
  defaults: AssetState;
}

export class IdentityManager {
  private currentProfile: ProfileType = 'default';
  private lastUpdateTimestamp: number = 0;
  private profileLockUntil: number = 0;
  
  // Hysteresis window: A state must remain active for a minimum duration (e.g. 5 mins) before an avatar change is queued.
  private stateStartTime: number = Date.now();
  private pendingProfile: ProfileType | null = null;

  // Discord enforces strict limits on avatar changes (e.g., max 2 per hour).
  // Minimum Cooldown Between Avatar Updates: 30 minutes.
  private readonly COOLDOWN_MS = 30 * 60 * 1000;
  private readonly STABILITY_WINDOW_MS = 5 * 60 * 1000;
  
  private registry: IdentityRegistry;
  private discordClient: Client | null = null;

  constructor() {
    this.registry = this.loadRegistry();
  }

  public setClient(client: Client) {
    this.discordClient = client;
  }

  private loadRegistry(): IdentityRegistry {
    const defaultRegistry: IdentityRegistry = {
      states: {
        playful:      { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Playful.png",    banner: null },
        chill:        { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Quiet.png",      banner: null },
        wise:         { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Nostalgic.png",       banner: null },
        chaos:        { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Playful.png",      banner: null },
        curious:      { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Social.png",    banner: null },
        supportive:   { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Wholesome.png", banner: null },
        competitive:  { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Focused.png",banner: null },
        sleepy:       { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Sleepy.png",     banner: null },
        event:        { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Wholesome.png",      banner: null },
        observer:     { avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Default.png",    banner: null }
      },
      defaults: {
        avatar: "https://raw.githubusercontent.com/rajuan34/MurgiBot-Pics/main/images/Default.png",
        banner: null
      }
    };

    try {
      const configPath = path.resolve(process.cwd(), 'identity-registry.json');
      if (fs.existsSync(configPath)) {
        const fileData = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(fileData);
      } else {
        fs.writeFileSync(configPath, JSON.stringify(defaultRegistry, null, 2));
      }
    } catch (e) {
      logger.error('Failed to load identity-registry.json, falling back to defaults', { error: String(e) });
    }
    return defaultRegistry;
  }

  public reloadRegistry(): boolean {
    try {
      this.registry = this.loadRegistry();
      return true;
    } catch (e) {
      return false;
    }
  }

  public lockProfile(durationMinutes: number) {
    this.profileLockUntil = Date.now() + durationMinutes * 60 * 1000;
    logger.info(`Profile locked for ${durationMinutes} minutes.`);
  }

  public unlockProfile() {
    this.profileLockUntil = 0;
    logger.info('Profile unlocked.');
  }

  /**
   * Attempts to update the character profile/avatar.
   * @param newProfile The target profile type
   * @param forceOverride Administrator bypass for rate limits
   * @returns boolean indicating if the update was allowed and successful
   */
  async updateProfile(newProfile: ProfileType, forceOverride: boolean = false): Promise<boolean> {
    newProfile = newProfile.toLowerCase();
    
    // Check lock
    if (!forceOverride && Date.now() < this.profileLockUntil) {
      logger.info(`Avatar change suppressed: Profile is locked.`);
      return false;
    }

    if (this.currentProfile === newProfile && !this.pendingProfile) {
      return true; // Already equipped
    }

    const now = Date.now();
    
    // Admin manual override logic
    if (forceOverride) {
      logger.info(`Identity Override: Forcing profile [${newProfile}]`);
      await this.applyDiscordProfile(newProfile);
      this.currentProfile = newProfile;
      this.lastUpdateTimestamp = now;
      this.pendingProfile = null;
      return true;
    }

    // A state shift occurred. If it's different from the pending profile, restart the stability window.
    if (this.pendingProfile !== newProfile) {
      this.pendingProfile = newProfile;
      this.stateStartTime = now;
      logger.info(`Started stability window for [${newProfile}]. Waiting for ${this.STABILITY_WINDOW_MS / 1000}s`);
    }

    // A. State Stability Window (Hysteresis)
    if (now - this.stateStartTime < this.STABILITY_WINDOW_MS) {
      // Suppress log to prevent spam, or use debug level
      return false;
    }

    // B. Cooldown Gate
    const timeSinceLastUpdate = now - this.lastUpdateTimestamp;
    if (timeSinceLastUpdate < this.COOLDOWN_MS) {
      const remainingMs = this.COOLDOWN_MS - timeSinceLastUpdate;
      logger.warn(`Avatar change suppressed: Cooldown active [${Math.ceil(remainingMs / 60000)}m remaining]`);
      return false;
    }

    // Passed both gates. Apply.
    logger.info(`Identity Shift: Murgi equipping profile [${newProfile}] (Previous: [${this.currentProfile}])`);
    
    try {
      await this.applyDiscordProfile(newProfile);
      this.currentProfile = newProfile;
      this.lastUpdateTimestamp = now;
      this.pendingProfile = null;
      return true;
    } catch (e) {
      logger.error('Failed to apply discord profile', { error: String(e) });
      return false;
    }
  }

  private async applyDiscordProfile(profile: string) {
    if (!this.discordClient || !this.discordClient.user) {
      logger.warn('Cannot apply discord profile: Client not connected or ready.');
      return;
    }
    
    const asset = this.registry.states[profile] || this.registry.defaults;
    const avatarUrl = asset.avatar;
    
    // Set Avatar via Discord API
    try {
      await this.discordClient.user.setAvatar(avatarUrl);
      logger.info(`Successfully set avatar to ${avatarUrl}`);
    } catch (error: any) {
      logger.error('Discord API Error while setting avatar', { error: error?.message || String(error) });
      throw error; // Re-throw to handle in caller
    }
  }

  getCurrentProfile(): ProfileType {
    return this.currentProfile;
  }
}
