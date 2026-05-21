/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeKonect'
const SITE_URL = 'https://vibekonect.com'

interface Props {
  recipientName?: string
  contestTitle?: string
  isWinner?: boolean
  winnerName?: string
  prize?: string
}

const Email = ({ recipientName, contestTitle, isWinner, winnerName, prize }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{isWinner ? '🏆 You won!' : 'Competition results are in'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Heading style={brand}>VibeKonect</Heading>
        </Section>
        <Container style={card}>
          {isWinner ? (
            <>
              <Heading style={h1}>🏆 You won!</Heading>
              <Text style={text}>
                {recipientName ? `${recipientName}, ` : ''}you bodied it.
              </Text>
              <Text style={text}>
                You're the winner of <strong>{contestTitle || 'the competition'}</strong>{prize ? ` — and you've bagged ${prize}` : ''}. We'll be in touch shortly with prize details.
              </Text>
            </>
          ) : (
            <>
              <Heading style={h1}>Results are in 🎤</Heading>
              <Text style={text}>
                {recipientName ? `Hey ${recipientName},` : 'Hey,'}
              </Text>
              <Text style={text}>
                <strong>{contestTitle || 'The competition'}</strong> just wrapped. Big shoutout to everyone who entered — the talent was crazy.
              </Text>
              <Text style={text}>
                🏆 The winner is <strong>{winnerName || 'TBA'}</strong>.
              </Text>
              <Text style={text}>
                Thanks for being part of it. The next challenge drops soon — stay locked in.
              </Text>
            </>
          )}
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button style={button} href={`${SITE_URL}/competition`}>
              See the competition
            </Button>
          </Section>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d.isWinner ? '🏆 You won the VibeKonect competition!' : 'VibeKonect competition results 🎤',
  displayName: 'Competition: winner announcement',
  previewData: { recipientName: 'Kemo', contestTitle: 'May Freestyle Challenge', isWinner: false, winnerName: 'KingFlow', prize: '£50 + free beat lease' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '20px' }
const banner = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' as const }
const brand = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, margin: 0 }
const card = { backgroundColor: '#fafafa', borderRadius: '0 0 12px 12px', padding: '32px 28px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const button = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block', fontSize: '15px' }
const footer = { fontSize: '13px', color: '#888', margin: '28px 0 0' }