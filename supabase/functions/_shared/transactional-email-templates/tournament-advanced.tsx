/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { styles as s } from './_tournament-shared.ts'

interface Props { artistName?: string; nextRound?: number; link?: string }

const Email = ({ artistName, nextRound, link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You advanced to the next round 🚀</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.banner}><Heading style={s.brand}>VibeKonect Crown 👑</Heading></Section>
        <Container style={s.card}>
          <Heading style={s.h1}>🚀 You advanced!</Heading>
          <Text style={s.text}>{artistName ? `Yo ${artistName},` : 'Yo,'}</Text>
          <Text style={s.text}>
            You won your battle{nextRound ? ` and you're in Round ${nextRound}` : ''}. The bracket gets harder from here — bring your A-game.
          </Text>
          {link && <Button style={s.button} href={link}>See the New Bracket</Button>}
          <Text style={s.footer}>— Team VibeKonect</Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'You advanced to the next round 🚀',
  displayName: 'Tournament: artist advanced',
  previewData: { artistName: 'Kemo', nextRound: 2, link: 'https://vibekonect.com/tournament' },
} satisfies TemplateEntry