import { logger } from '../telemetry/logger';

export type PersonalityState = 'Playful' | 'Chill' | 'Wise' | 'Chaos' | 'Curious' | 'Supportive' | 'Competitive' | 'Sleepy' | 'Event' | 'Observer' | 'RESPECTFUL_SON_CALM' | 'RESPECTFUL_FRIENDLY' | 'RESPECTFUL_UNCAL_CALM';

export class EmotionEngine {
  private currentState: PersonalityState = 'Playful';
  private turnsInCurrentState: number = 0;
  private lastEvaluatedTimestamp: number = Date.now();

  /**
   * Evaluates the incoming message and automatically shifts Bohurupi's mood.
   * Strictly uses provided PersonalityStates.
   * Naturally decays back to default 'Playful' state after 3 turns or inactivity.
   */
  evaluateInteraction(message: string): PersonalityState {
    const text = (message || '').toLowerCase();
    const now = Date.now();
    let nextState = this.currentState;

    // Time-based decay: if idle for more than 5 minutes, reset to default Playful
    if (now - this.lastEvaluatedTimestamp > 5 * 60 * 1000) {
      nextState = 'Playful';
      this.turnsInCurrentState = 0;
    }
    this.lastEvaluatedTimestamp = now;

    let matchedTrigger = false;

    if (/(fight|battle|win|lose|noob|trash|1v1|beat|dare|bet|mara|muri|⚔️|🥊)/.test(text)) {
      nextState = 'Competitive';
      matchedTrigger = true;
    } else if (/(crazy|wild|destroy|burn|scream|ahhh|wtf|lmao|lol|pagol|mor|morbi|💀|🔥|🤡|panic|panik|shock|😱|😨)/.test(text)) {
      nextState = 'Chaos';
      matchedTrigger = true;
    } else if (/(why|how|what|explain|tell|who|kivabe|keno|koi|👀|🤔|🤨|🧐)/.test(text)) {
      nextState = 'Curious';
      matchedTrigger = true;
    } else if (/(sleep|tired|night|boring|yawn|bed|ghum|klanto|😴|🥱|💤)/.test(text)) {
      nextState = 'Sleepy';
      matchedTrigger = true;
    } else if (/(sad|help|depressed|hurt|broken|please|kanna|kosto|😭|😢|🥺|💔)/.test(text)) {
      nextState = 'Supportive'; 
      matchedTrigger = true;
    } else if (/(smart|wise|advice|life|universe|think|gyan|bujhsi|🗿|🍷)/.test(text)) {
      nextState = 'Wise';
      matchedTrigger = true;
    } else if (/(relax|calm|peace|shanti|unwind|chill out|chilling|☕|😎)/.test(text)) {
      nextState = 'Chill';
      matchedTrigger = true;
    } else if (/(game|play|fun|joke|prank|khela|moja|🤣|😂|🎉)/.test(text)) {
      nextState = 'Playful';
      matchedTrigger = true;
    } else if (/(event|party|eid|celebrate|happy new year|🎂|🎁)/.test(text)) {
      nextState = 'Event';
      matchedTrigger = true;
    }

    // Natural decay: if non-default state persists for > 3 turns without matching a trigger, return to Playful
    if (!matchedTrigger && this.currentState !== 'Playful') {
      this.turnsInCurrentState++;
      if (this.turnsInCurrentState >= 3) {
        nextState = 'Playful';
        this.turnsInCurrentState = 0;
      }
    } else if (matchedTrigger) {
      this.turnsInCurrentState = 0;
    }

    if (this.currentState !== nextState) {
      this.setState(nextState);
    }
    
    return this.currentState;
  }

  /**
   * Administrative / Manual state setting.
   */
  setState(newState: PersonalityState): PersonalityState {
    if (this.currentState !== newState) {
      logger.info(`State Shift: Bohurupi transitioned from [${this.currentState}] to [${newState}]`);
      this.currentState = newState;
      this.turnsInCurrentState = 0;
    }
    return this.currentState;
  }

  getCurrentMood(): PersonalityState {
    return this.currentState;
  }
}
