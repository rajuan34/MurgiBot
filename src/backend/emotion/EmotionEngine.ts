import { logger } from '../telemetry/logger';

export type PersonalityState = 'Playful' | 'Chill' | 'Wise' | 'Chaos' | 'Curious' | 'Supportive' | 'Competitive' | 'Sleepy' | 'Event' | 'Observer' | 'RESPECTFUL_SON_CALM' | 'RESPECTFUL_FRIENDLY';

export class EmotionEngine {
  private currentState: PersonalityState = 'Playful';

  /**
   * Evaluates the incoming message. 
   * As per the new directive: Murgi's mood MUST NOT change based on individual chat content.
   * Therefore, this simply returns the current state.
   */
  evaluateInteraction(message: string): PersonalityState {
    return this.currentState;
  }

  /**
   * Administrative / Manual state setting.
   */
  setState(newState: PersonalityState): PersonalityState {
    if (this.currentState !== newState) {
      logger.info(`State Shift: Murgi transitioned from [${this.currentState}] to [${newState}]`);
      this.currentState = newState;
    }
    return this.currentState;
  }

  getCurrentMood(): PersonalityState {
    return this.currentState;
  }
}
