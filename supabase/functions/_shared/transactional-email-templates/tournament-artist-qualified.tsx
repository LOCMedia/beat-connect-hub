/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { styles as s } from './_tournament-shared.ts'

interface Props { artistName?: string; tournamentName?: string; seed?: number; link?: string }

const Email = ({ artistName, tournamentName, seed, link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>You've qualified for the tournament 🔥</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.banner}><Heading style={s.brand}>VibeKonect Crown 👑</Heading></Section>
        <Container style={s.card}>
          <Heading style={s.h1}>🔥 You're in the bracket!</Heading>
          <Text style={s.text}>{artistName ? `Yo ${artistName},` : 'Yo,'}</Text>
          <Text style={s.text}>
            You've been qualified for{tournamentName ? ` ${tournamentName}` : ' the tournament'}{seed ? ` as seed #${seed}` : ''}. Round 1 battles are about to drop.
          </Text>
          <Text style={s.text}>Tell your fans to vote — every vote counts.</Text>
          {link && <Button style={s.button} href={link}>View Bracket</Button>}
          <Text style={s.footer}>— Team VibeKonect</Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: "You've qualified for the tournament 🔥",
  displayName: 'Tournament: artist qualified',
  previewData: { artistName: 'Kemo', tournamentName: 'VibeKonect Crown - May 2026', seed: 3, link: 'https://vibekonect.com/tournament' },
} satisfies TemplateEntry