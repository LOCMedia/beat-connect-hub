/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as competitionSubmissionReceived } from './competition-submission-received.tsx'
import { template as competitionEntryDecision } from './competition-entry-decision.tsx'
import { template as competitionWinnerAnnouncement } from './competition-winner-announcement.tsx'
import { template as sponsorChallengeEnded } from './sponsor-challenge-ended.tsx'
import { template as tournamentBeatApproved } from './tournament-beat-approved.tsx'
import { template as tournamentArtistQualified } from './tournament-artist-qualified.tsx'
import { template as tournamentBattleLive } from './tournament-battle-live.tsx'
import { template as tournamentAdvanced } from './tournament-advanced.tsx'
import { template as tournamentChampion } from './tournament-champion.tsx'
import { template as tournamentBeatWon } from './tournament-beat-won.tsx'
import { template as newsletterWelcome } from './newsletter-welcome.tsx'
import { template as freeBeatDownload } from './free-beat-download.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'competition-submission-received': competitionSubmissionReceived,
  'competition-entry-decision': competitionEntryDecision,
  'competition-winner-announcement': competitionWinnerAnnouncement,
  'sponsor-challenge-ended': sponsorChallengeEnded,
  'tournament-beat-approved': tournamentBeatApproved,
  'tournament-artist-qualified': tournamentArtistQualified,
  'tournament-battle-live': tournamentBattleLive,
  'tournament-advanced': tournamentAdvanced,
  'tournament-champion': tournamentChampion,
  'tournament-beat-won': tournamentBeatWon,
  'newsletter-welcome': newsletterWelcome,
  'free-beat-download': freeBeatDownload,
}