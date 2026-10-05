import React from 'react';
import { View } from 'react-native';
import { Text } from '@/design/text';

import { getCvThemeById } from '@/data/cv';

/**
 * Aperçu A4 du CV (mobile). Layout commun pour les 12 thèmes — seule la
 * couleur d'accent change. Dessiné en 320×452 (A4 portrait) puis mis à
 * l'échelle de `width`. Les couleurs en dur reproduisent le document
 * imprimé (fond blanc quel que soit le mode sombre), pas l'interface.
 */

export interface PreviewCv {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  summary: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  activeTheme?: string;
  experiences: {
    id: string;
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description: string;
  }[];
  education: {
    id: string;
    degree: string;
    school: string;
    year: string;
    description?: string;
  }[];
  skills: { id: string; name: string; level: string }[];
  languages: { id: string; name: string; level: string }[];
  hobbies: string[];
}

const W = 320;
const H = 452;

export function CvPreview({
  cv,
  themeId,
  width = W,
}: {
  cv: PreviewCv;
  themeId?: string;
  /** Largeur affichée ; la hauteur suit le ratio A4. */
  width?: number;
}) {
  const theme = getCvThemeById(themeId ?? cv.activeTheme);
  const accent = theme.color;
  const muted = '#74766B';
  const ink = '#16170F';
  const scale = width / W;

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Aperçu du CV de ${[cv.firstName, cv.lastName].filter(Boolean).join(' ') || 'ton profil'}`}
      style={{ width, height: H * scale, overflow: 'hidden', borderWidth: 1, borderColor: '#E6E4DD', borderRadius: 6, backgroundColor: '#fff' }}
    >
      <View
        style={{
          width: W,
          height: H,
          backgroundColor: '#fff',
          transform: [{ scale }],
          transformOrigin: 'top left',
          overflow: 'hidden',
        }}
      >
        {/* Bandeau header */}
        <View style={{ backgroundColor: accent, paddingHorizontal: 22, paddingVertical: 18 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: '#fff', letterSpacing: -0.4 }}>
            {cv.firstName || '—'}{' '}
            <Text style={{ fontWeight: '400', opacity: 0.85 }}>{cv.lastName}</Text>
          </Text>
          {cv.experiences[0]?.title ? (
            <Text style={{ fontSize: 10, color: '#fff', opacity: 0.92, marginTop: 4 }}>
              {cv.experiences[0].title}
            </Text>
          ) : null}
          <Text style={{ fontSize: 8, color: '#fff', opacity: 0.86, marginTop: 8 }}>
            {[cv.email, cv.phone, cv.address].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {/* Corps */}
        <View style={{ flex: 1, paddingHorizontal: 22, paddingVertical: 14 }}>
          {cv.summary ? (
            <>
              <SectionTitle color={accent}>Profil</SectionTitle>
              <Text style={{ fontSize: 8, color: muted, lineHeight: 12 }}>{cv.summary}</Text>
            </>
          ) : null}

          {cv.experiences.length > 0 ? (
            <>
              <SectionTitle color={accent}>Expériences</SectionTitle>
              {cv.experiences.slice(0, 3).map((e) => (
                <View key={e.id} style={{ marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: ink, flexShrink: 1 }}>
                      {e.title}
                    </Text>
                    <Text style={{ fontSize: 7, color: muted }}>
                      {e.current ? `${e.startDate} → aujourd’hui` : `${e.startDate} → ${e.endDate ?? ''}`}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 8, color: accent, fontWeight: '600' }}>{e.company}</Text>
                  {e.description ? (
                    <Text
                      style={{ fontSize: 7.5, color: muted, marginTop: 2 }}
                      numberOfLines={3}
                    >
                      {e.description}
                    </Text>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}

          {cv.education.length > 0 ? (
            <>
              <SectionTitle color={accent}>Formation</SectionTitle>
              {cv.education.map((e) => (
                <View
                  key={e.id}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8.5, fontWeight: '600', color: ink }}>{e.degree}</Text>
                    <Text style={{ fontSize: 7.5, color: muted }}>{e.school}</Text>
                  </View>
                  <Text style={{ fontSize: 7, color: muted }}>{e.year}</Text>
                </View>
              ))}
            </>
          ) : null}

          {cv.skills.length > 0 ? (
            <>
              <SectionTitle color={accent}>Compétences</SectionTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                {cv.skills.map((s) => (
                  <View
                    key={s.id}
                    style={{
                      borderWidth: 1,
                      borderColor: accent,
                      borderRadius: 99,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: 7.5, color: accent, fontWeight: '500' }}>{s.name}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {cv.languages.length > 0 ? (
            <>
              <SectionTitle color={accent}>Langues</SectionTitle>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {cv.languages.map((l) => (
                  <Text key={l.id} style={{ fontSize: 8, color: ink }}>
                    {l.name} <Text style={{ color: muted }}>· {l.level}</Text>
                  </Text>
                ))}
              </View>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function SectionTitle({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <Text
      style={{
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.2,
        color,
        marginTop: 12,
        marginBottom: 5,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Text>
  );
}
