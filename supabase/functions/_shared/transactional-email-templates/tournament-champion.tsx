/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { styles as s } from './_tournament-shared.ts'

interface Props { artistName?: string; tournamentName?: string; prize?: string; link?: string }

const Email = ({ artistName, tournamentName, prize, link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>👑 You're the VibeKonect Champion!</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.banner}><Heading style={s.brand}>VibeKonect Crown 👑</Heading></Section>
        <Container style={s.card}>
          <Heading style={s.h1}>👑 Champion crowned</Heading>
          <Text style={s.text}>{artistName ? `${artistName},` : 'Champ,'}</Text>
          <Text style={s.text}>
            You did it. You won{tournamentName ? ` ${tournamentName}` : ' the tournament'}. The 👑 Champion badge is now on your profile.
          </Text>
          {prize && <Text style={s.text}><strong>Prize:</strong> {prize}</Text>}
          <Text style={s.text}>We'll be in touch about claiming your prize.</Text>
          {link && <Button style={s.button} href={link}>See Your Crown</Button>}
          <Text style={s.footer}>— Team VibeKonect</Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: '👑 You won the tournament!',
  displayName: 'Tournament: champion crowned',
  previewData: { artistName: 'Kemo', tournamentName: 'VibeKonect Crown - May 2026', prize: '£50 + free beat lease + 🏆 badge', link: 'https://vibekonect.com/tournament' },
} satisfies TemplateEntry