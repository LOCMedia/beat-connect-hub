/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeKonect'
const SITE_URL = 'https://vibekonect.com'

interface Props {
  sponsorName?: string
  challengeTitle?: string
  totalSubmissions?: number
  totalVotes?: number
  winnerName?: string
  challengeId?: string
}

const Email = ({
  sponsorName, challengeTitle, totalSubmissions = 0, totalVotes = 0, winnerName, challengeId,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your challenge has ended — here's how it went</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Heading style={brand}>VibeKonect</Heading>
        </Section>
        <Container style={card}>
          <Heading style={h1}>🏁 Your challenge wrapped!</Heading>
          <Text style={text}>
            {sponsorName ? `Hi ${sponsorName},` : 'Hi,'}
          </Text>
          <Text style={text}>
            Your sponsored challenge <strong>{challengeTitle || ''}</strong> has officially ended. Here's the recap:
          </Text>
          <Section style={stats}>
            <Text style={statRow}>📥 Submissions: <strong>{totalSubmissions}</strong></Text>
            <Text style={statRow}>🗳️ Total votes: <strong>{totalVotes}</strong></Text>
            <Text style={statRow}>🏆 Winner: <strong>{winnerName || 'TBA'}</strong></Text>
          </Section>
          <Text style={text}>
            We'll handle the prize payout to the winner. Your commission report will be available in your dashboard.
          </Text>
          {challengeId && (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button style={button} href={`${SITE_URL}/sponsor/dashboard`}>
                View dashboard
              </Button>
            </Section>
          )}
          <Text style={text}>
            Thanks for partnering with us — let's run another one soon 🚀
          </Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your VibeKonect challenge has ended 🏁',
  displayName: 'Sponsor: challenge ended',
  previewData: { sponsorName: 'Atlas Records', challengeTitle: 'Dance to Drift', totalSubmissions: 42, totalVotes: 1280, winnerName: 'KingFlow', challengeId: 'abc-123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '20px' }
const banner = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' as const }
const brand = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, margin: 0 }
const card = { backgroundColor: '#fafafa', borderRadius: '0 0 12px 12px', padding: '32px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const stats = { background: '#fff', borderRadius: '8px', padding: '16px 20px', margin: '20px 0', borderLeft: '4px solid #8b5cf6' }
const statRow = { fontSize: '15px', color: '#1a1a1a', margin: '6px 0' }
const button = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block', fontSize: '15px' }
const footer = { fontSize: '13px', color: '#888', margin: '28px 0 0' }