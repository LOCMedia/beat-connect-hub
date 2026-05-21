/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeKonect'

interface Props {
  artistName?: string
  contestTitle?: string
}

const Email = ({ artistName, contestTitle }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We got your freestyle submission 🎤</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Heading style={brand}>VibeKonect</Heading>
        </Section>
        <Container style={card}>
          <Heading style={h1}>🎤 Submission received!</Heading>
          <Text style={text}>
            {artistName ? `Yo ${artistName},` : 'Yo,'}
          </Text>
          <Text style={text}>
            We got your entry{contestTitle ? ` for "${contestTitle}"` : ''}. Our team will review it shortly.
          </Text>
          <Text style={text}>
            Once approved, your freestyle goes live on the voting page and the world starts hearing your fire 🔥
          </Text>
          <Text style={footer}>— The {SITE_NAME} Team</Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your freestyle submission was received 🎤',
  displayName: 'Competition: submission received',
  previewData: { artistName: 'Kemo', contestTitle: 'May Freestyle Challenge' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '20px' }
const banner = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' as const }
const brand = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, margin: 0 }
const card = { backgroundColor: '#fafafa', borderRadius: '0 0 12px 12px', padding: '32px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const footer = { fontSize: '13px', color: '#888', margin: '28px 0 0' }