/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { styles as s } from './_tournament-shared.ts'

interface Props { producerName?: string; beatTitle?: string; tournamentName?: string; link?: string }

const Email = ({ producerName, beatTitle, tournamentName, link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your beat is in the pool 🎛️</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.banner}><Heading style={s.brand}>VibeKonect Crown 👑</Heading></Section>
        <Container style={s.card}>
          <Heading style={s.h1}>🎛️ Your beat is live in the pool</Heading>
          <Text style={s.text}>{producerName ? `Yo ${producerName},` : 'Yo,'}</Text>
          <Text style={s.text}>
            Your beat{beatTitle ? ` "${beatTitle}"` : ''} has been approved for{tournamentName ? ` ${tournamentName}` : ' the tournament'}. Artists can now pick it for their freestyle.
          </Text>
          <Text style={s.text}>If your beat carries an artist to victory, you get the 🏆 Tournament Winner badge on your beat.</Text>
          {link && <Button style={s.button} href={link}>View Beat Pool</Button>}
          <Text style={s.footer}>— Team VibeKonect</Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your beat is in the tournament pool 🎛️',
  displayName: 'Tournament: producer beat approved',
  previewData: { producerName: 'KemoBeats', beatTitle: 'Midnight Drill', tournamentName: 'VibeKonect Crown - May 2026', link: 'https://vibekonect.com/tournament/beat-pool' },
} satisfies TemplateEntry