/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { styles as s } from './_tournament-shared.ts'

interface Props { artistName?: string; opponentName?: string; round?: number; closesAt?: string; link?: string }

const Email = ({ artistName, opponentName, round, closesAt, link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your battle is LIVE — rally your fans 🥊</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.banner}><Heading style={s.brand}>VibeKonect Crown 👑</Heading></Section>
        <Container style={s.card}>
          <Heading style={s.h1}>🥊 Your battle is live</Heading>
          <Text style={s.text}>{artistName ? `Yo ${artistName},` : 'Yo,'}</Text>
          <Text style={s.text}>
            You're up{opponentName ? ` against ${opponentName}` : ''}{round ? ` in Round ${round}` : ''}. Voting{closesAt ? ` closes ${closesAt}` : ''}.
          </Text>
          <Text style={s.text}>Drop the link to your fans, your group chats, your IG. The crowd decides.</Text>
          {link && <Button style={s.button} href={link}>Open My Battle</Button>}
          <Text style={s.footer}>— Team VibeKonect</Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your battle is LIVE — rally your fans 🥊',
  displayName: 'Tournament: battle live',
  previewData: { artistName: 'Kemo', opponentName: 'Lex', round: 1, closesAt: 'in 24 hours', link: 'https://vibekonect.com/tournament/battle/abc' },
} satisfies TemplateEntry