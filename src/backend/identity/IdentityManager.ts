import { logger } from '../telemetry/logger';

export type ProfileType = string;

export class IdentityManager {
  private currentProfile: ProfileType = 'default';

  constructor() {}

  // We keep this method for API compatibility with MurgiBrain, 
  // but it no longer changes any Discord profile picture.
  async updateProfile(newProfile: ProfileType): Promise<boolean> {
    newProfile = newProfile.toLowerCase();
    
    if (this.currentProfile !== newProfile) {
      this.currentProfile = newProfile;
    }
    return true;
  }

  getCurrentProfile(): ProfileType {
    return this.currentProfile;
  }

  // Stubs to avoid breaking other imports that might use them (like DiscordService or MurgiBrain if they were left intact)
  public setClient(client: any) {}
  public lockProfile(durationMinutes: number) {}
  public unlockProfile() {}
  public reloadRegistry(): boolean { return true; }
}
