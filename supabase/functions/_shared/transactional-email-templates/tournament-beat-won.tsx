/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'
import { styles as s } from './_tournament-shared.ts'

interface Props { producerName?: string; beatTitle?: string; tournamentName?: string; artistName?: string; link?: string }

const Email = ({ producerName, beatTitle, tournamentName, artistName, link }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>🏆 Your beat won the tournament!</Preview>
    <Body style={s.main}>
      <Container style={s.container}>
        <Section style={s.banner}><Heading style={s.brand}>VibeKonect Crown 👑</Heading></Section>
        <Container style={s.card}>
          <Heading style={s.h1}>🏆 Your beat won</Heading>
          <Text style={s.text}>{producerName ? `Yo ${producerName},` : 'Yo,'}</Text>
          <Text style={s.text}>
            Your beat{beatTitle ? ` "${beatTitle}"` : ''} carried{artistName ? ` ${artistName}` : ' the champion'} all the way to the crown of{tournamentName ? ` ${tournamentName}` : ' the tournament'}.
          </Text>
          <Text style={s.text}>It now wears the 🏆 Tournament Winner badge wherever it appears on VibeKonect.</Text>
          {link && <Button style={s.button} href={link}>View Your Beat</Button>}
          <Text style={s.footer}>— Team VibeKonect</Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: '🏆 Your beat won the tournament!',
  displayName: 'Tournament: producer beat won',
  previewData: { producerName: 'KemoBeats', beatTitle: 'Midnight Drill', tournamentName: 'VibeKonect Crown - May 2026', artistName: 'Lex', link: 'https://vibekonect.com/tournament' },
} satisfies TemplateEntry