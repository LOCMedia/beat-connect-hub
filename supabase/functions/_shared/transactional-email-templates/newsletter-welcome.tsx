/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  unsubscribeUrl?: string
}

const Email = ({ unsubscribeUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Welcome to VibeKonect updates</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Heading style={brand}>VibeKonect</Heading>
        </Section>
        <Container style={card}>
          <Heading style={h1}>You're in 💜</Heading>
          <Text style={text}>
            Thanks for subscribing! You'll hear about competitions, new beat drops, and winner announcements — straight to your inbox.
          </Text>
          <Text style={text}>
            No confirmations needed. You're already on the list.
          </Text>
          {unsubscribeUrl && (
            <Section style={{ textAlign: 'center' as const, margin: '24px 0' }}>
              <Button href="https://vibekonect.com" style={btn}>Visit VibeKonect</Button>
            </Section>
          )}
          <Text style={footer}>
            Don't want these emails? <a href={unsubscribeUrl} style={link}>Unsubscribe anytime</a>.
          </Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Welcome to VibeKonect updates',
  displayName: 'Newsletter: welcome',
  previewData: { unsubscribeUrl: 'https://vibekonect.com/unsubscribe-notifications?token=abc123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '20px' }
const banner = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' as const }
const brand = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, margin: 0 }
const card = { backgroundColor: '#fafafa', borderRadius: '0 0 12px 12px', padding: '32px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: '#8b5cf6', textDecoration: 'underline' }
const btn = { backgroundColor: '#8b5cf6', color: '#ffffff', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' as const, fontSize: '14px' }
const footer = { fontSize: '13px', color: '#888', margin: '28px 0 0' }
