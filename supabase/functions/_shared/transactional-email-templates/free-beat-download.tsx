/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeKonect'
const SITE_URL = 'https://vibekonect.com'
const IG_HANDLE = 'locbeatx'

interface Props {
  fullName?: string
  beatTitle?: string
  beatGenre?: string
  beatBpm?: number
  beatKey?: string
  coverImageUrl?: string
  downloadUrl?: string
  expiresInHours?: number
  producerChatUrl?: string
}

const Email = ({
  fullName, beatTitle, beatGenre, beatBpm, beatKey, coverImageUrl,
  downloadUrl, expiresInHours = 48, producerChatUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your free beat "{beatTitle ?? 'download'}" is ready 🎧</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={banner}>
          <Heading style={brand}>{SITE_NAME}</Heading>
          <Text style={tagline}>Beats. Artists. Vibes.</Text>
        </Section>
        <Container style={card}>
          <Heading style={h1}>
            {fullName ? `Thanks ${fullName}!` : 'Thanks for downloading!'}
          </Heading>
          <Text style={text}>
            Your free beat is ready. The download link below is valid for the next {expiresInHours} hours.
          </Text>

          {coverImageUrl && (
            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Img src={coverImageUrl} alt={beatTitle ?? 'Beat cover'} width="220" height="220" style={cover} />
            </Section>
          )}

          {beatTitle && (
            <Section style={beatBox}>
              <Text style={beatTitleStyle}>🎵 {beatTitle}</Text>
              <Text style={beatMeta}>
                {[beatGenre, beatBpm ? `${beatBpm} BPM` : null, beatKey].filter(Boolean).join(' • ')}
              </Text>
            </Section>
          )}

          {downloadUrl && (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={downloadUrl} style={ctaBtn}>⬇ Download your beat</Button>
            </Section>
          )}

          <Text style={text}>
            <strong>Made a song with it?</strong> Tag <Link style={link} href={`https://instagram.com/${IG_HANDLE}`}>@{IG_HANDLE}</Link> on Instagram — we love reposting fire.
          </Text>

          {producerChatUrl && (
            <Section style={{ textAlign: 'center', margin: '20px 0' }}>
              <Button href={producerChatUrl} style={secondaryBtn}>💬 Need a custom license? Chat with the producer</Button>
            </Section>
          )}

          <Text style={footer}>
            Follow us on Instagram <Link style={link} href={`https://instagram.com/${IG_HANDLE}`}>@{IG_HANDLE}</Link><br />
            Visit <Link style={link} href={SITE_URL}>{SITE_URL.replace('https://', '')}</Link><br /><br />
            — The {SITE_NAME} Team
          </Text>
        </Container>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Your free beat${d.beatTitle ? ` "${d.beatTitle}"` : ''} is ready 🎧`,
  displayName: 'Free beat download',
  previewData: {
    fullName: 'Jane',
    beatTitle: 'Midnight Drive',
    beatGenre: 'Trap',
    beatBpm: 140,
    beatKey: 'Am',
    downloadUrl: 'https://example.com/download',
    producerChatUrl: 'https://vibekonect.com/?beat=demo',
    expiresInHours: 48,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '600px', margin: '0 auto', padding: '20px' }
const banner = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '14px 14px 0 0', padding: '28px 24px', textAlign: 'center' as const }
const brand = { color: '#ffffff', fontSize: '28px', fontWeight: 'bold' as const, margin: 0, letterSpacing: '0.5px' }
const tagline = { color: 'rgba(255,255,255,0.85)', fontSize: '13px', margin: '6px 0 0' }
const card = { backgroundColor: '#fafafa', borderRadius: '0 0 14px 14px', padding: '32px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 14px' }
const cover = { borderRadius: '12px', display: 'block', margin: '0 auto', maxWidth: '100%', height: 'auto' }
const beatBox = { background: '#ffffff', border: '1px solid #eee', borderRadius: '10px', padding: '14px 16px', margin: '16px 0' }
const beatTitleStyle = { fontSize: '16px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: 0 }
const beatMeta = { fontSize: '13px', color: '#777', margin: '4px 0 0' }
const ctaBtn = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#ffffff', padding: '14px 28px', borderRadius: '999px', fontWeight: 'bold' as const, fontSize: '15px', textDecoration: 'none', display: 'inline-block' }
const secondaryBtn = { background: '#ffffff', color: '#8b5cf6', border: '2px solid #8b5cf6', padding: '11px 22px', borderRadius: '999px', fontWeight: 'bold' as const, fontSize: '14px', textDecoration: 'none', display: 'inline-block' }
const link = { color: '#8b5cf6', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#888', margin: '28px 0 0', lineHeight: '1.6', textAlign: 'center' as const }