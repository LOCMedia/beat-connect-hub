/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'VibeKonect'
const SITE_URL = 'https://vibekonect.com'

interface Props {
  artistName?: string
  contestTitle?: string
  decision?: 'approved' | 'rejected'
  reason?: string
  entryId?: string
}

const Email = ({ artistName, contestTitle, decision = 'approved', reason, entryId }: Props) => {
  const approved = decision === 'approved'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{approved ? 'Your entry is live 🔥' : 'Update on your submission'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={banner}>
            <Heading style={brand}>VibeKonect</Heading>
          </Section>
          <Container style={card}>
            <Heading style={h1}>
              {approved ? '✅ You\'re in!' : 'Submission update'}
            </Heading>
            <Text style={text}>
              {artistName ? `Hey ${artistName},` : 'Hey,'}
            </Text>
            {approved ? (
              <>
                <Text style={text}>
                  Your entry{contestTitle ? ` for "${contestTitle}"` : ''} just got <strong>approved</strong>. Time to start campaigning for votes 📣
                </Text>
                {entryId && (
                  <Section style={{ textAlign: 'center', margin: '28px 0' }}>
                    <Button style={button} href={`${SITE_URL}/competition/entry/${entryId}`}>
                      View your entry
                    </Button>
                  </Section>
                )}
                <Text style={text}>
                  Share your link everywhere — every vote counts.
                </Text>
              </>
            ) : (
              <>
                <Text style={text}>
                  Unfortunately your entry{contestTitle ? ` for "${contestTitle}"` : ''} wasn't approved this round.
                </Text>
                {reason && (
                  <Text style={{ ...text, background: '#fff', padding: '12px 16px', borderLeft: '3px solid #ec4899', borderRadius: '4px' }}>
                    <strong>Reason:</strong> {reason}
                  </Text>
                )}
                <Text style={text}>
                  Don't sweat it — we'd love to see you submit again next time.
                </Text>
              </>
            )}
            <Text style={footer}>— The {SITE_NAME} Team</Text>
          </Container>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d.decision === 'rejected'
      ? 'Update on your VibeKonect submission'
      : 'Your VibeKonect entry is live 🔥',
  displayName: 'Competition: approve/reject',
  previewData: { artistName: 'Kemo', contestTitle: 'May Freestyle Challenge', decision: 'approved', entryId: 'abc-123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif', margin: 0, padding: 0 }
const container = { maxWidth: '560px', margin: '0 auto', padding: '20px' }
const banner = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', borderRadius: '12px 12px 0 0', padding: '24px', textAlign: 'center' as const }
const brand = { color: '#ffffff', fontSize: '24px', fontWeight: 'bold' as const, margin: 0 }
const card = { backgroundColor: '#fafafa', borderRadius: '0 0 12px 12px', padding: '32px 28px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const button = { background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#ffffff', padding: '12px 28px', borderRadius: '8px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block', fontSize: '15px' }
const footer = { fontSize: '13px', color: '#888', margin: '28px 0 0' }