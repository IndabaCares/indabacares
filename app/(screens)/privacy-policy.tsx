import React from 'react';
import { View, Text, ScrollView, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';

const LAST_UPDATED = 'April 2025';
const CONTACT_EMAIL = 'privacy@indabacares.com';

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Privacy Policy</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lastUpdated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Introduction">
          <Body>
            IndabaCares ("we", "our", or "the App") is an employee recognition and
            engagement platform operated on behalf of your employer (the hotel or
            hospitality group that has licensed IndabaCares). This Privacy Policy
            explains what personal data we collect, why we collect it, how it is used,
            and your rights regarding that data.
          </Body>
          <Body>
            By using IndabaCares you confirm that you have read and understood this policy.
            If you have any questions, contact us at {CONTACT_EMAIL}.
          </Body>
        </Section>

        <Section title="2. Who Controls Your Data">
          <Body>
            Your employer is the primary data controller for the personal data held in
            IndabaCares. Indaba Cares (Pty) Ltd acts as a data processor on your
            employer's behalf. Queries about how your employer manages your data should
            be directed to your HR department.
          </Body>
        </Section>

        <Section title="3. Data We Collect">
          <SubHeading>3.1 Account & Identity</SubHeading>
          <Body>
            • Full name and employee code (assigned by your employer){'\n'}
            • Department and hotel/property{'\n'}
            • Profile photograph (optional, uploaded by you){'\n'}
            • Role (employee, manager, administrator)
          </Body>

          <SubHeading>3.2 Activity Data</SubHeading>
          <Body>
            • Recognition posts you send and receive (message, badge, timestamp){'\n'}
            • Reactions and comments you make on recognition posts{'\n'}
            • Points earned, awarded, and redeemed{'\n'}
            • Reward redemption requests and their status{'\n'}
            • Skill ratings you submit or receive from colleagues{'\n'}
            • Chat messages sent in the hotel chat channel{'\n'}
            • Badges and achievements earned
          </Body>

          <SubHeading>3.3 Mood Data</SubHeading>
          <Body>
            • Daily mood check-in (a 5-level emoji scale){'\n'}
            • Optional free-text note accompanying the mood entry{'\n'}
            {'\n'}
            Individual mood entries are private. Aggregated, anonymised mood trends
            may be shared with your hotel's management.
          </Body>

          <SubHeading>3.4 Device & Technical Data</SubHeading>
          <Body>
            • Push notification token (Expo push token for your device){'\n'}
            • Device platform (iOS or Android){'\n'}
            • App version and session timestamps{'\n'}
            • IP address (captured by server logs for rate limiting and security)
          </Body>

          <SubHeading>3.5 Data We Do NOT Collect</SubHeading>
          <Body>
            • Passwords — your password is hashed server-side using bcrypt and is
            never stored in plain text or transmitted after entry.{'\n'}
            • Location data — we do not access your GPS or location at any time.{'\n'}
            • Contacts — we do not access your phone's contact list.{'\n'}
            • Microphone or audio — we do not record audio.
          </Body>
        </Section>

        <Section title="4. How We Use Your Data">
          <Body>
            • To operate the recognition, rewards, and engagement features of the App{'\n'}
            • To authenticate your identity and maintain your session securely{'\n'}
            • To deliver push notifications about recognitions, rewards, and updates{'\n'}
            • To display your profile, points balance, and achievements{'\n'}
            • To generate leaderboard rankings and anonymised analytics for your employer{'\n'}
            • To detect and prevent fraud, abuse, or security threats{'\n'}
            • To comply with applicable law and legal obligations
          </Body>
        </Section>

        <Section title="5. Legal Basis for Processing">
          <Body>
            We process your personal data on the following bases:{'\n'}
            {'\n'}
            • <Text style={s.bold}>Contract:</Text> Processing is necessary to provide
            the services described in your employer's agreement with IndabaCares.{'\n'}
            • <Text style={s.bold}>Legitimate interests:</Text> Security monitoring,
            fraud prevention, and service improvement.{'\n'}
            • <Text style={s.bold}>Legal obligation:</Text> Where required by applicable
            law (including POPIA and GDPR where applicable).
          </Body>
        </Section>

        <Section title="6. Data Sharing">
          <Body>
            We do not sell your personal data. We may share your data with:{'\n'}
            {'\n'}
            • <Text style={s.bold}>Your employer</Text> — management and HR staff who
            administer the platform have access to recognition activity, points, and
            aggregated mood data.{'\n'}
            • <Text style={s.bold}>Supabase (infrastructure provider)</Text> — our
            database, storage, and backend are hosted on Supabase. Data is stored in
            secure, access-controlled cloud infrastructure.{'\n'}
            • <Text style={s.bold}>Expo (push notification delivery)</Text> — your
            device push token is transmitted to Expo's push notification service to
            deliver alerts.{'\n'}
            • <Text style={s.bold}>Law enforcement</Text> — where required by a valid
            legal order.
          </Body>
        </Section>

        <Section title="7. Data Retention">
          <Body>
            Your personal data is retained for as long as your employment record is
            active in the App, plus a period determined by your employer's data retention
            policy (typically 12 months after account deactivation).
          </Body>
          <Body>
            Push notification tokens are removed when you log out of the App.
          </Body>
        </Section>

        <Section title="8. Data Security">
          <Body>
            • All data is transmitted over HTTPS (TLS 1.2+).{'\n'}
            • Session tokens are stored in your device's secure enclave
            (iOS Keychain / Android Keystore) — not in unencrypted app storage.{'\n'}
            • Passwords are hashed server-side using bcrypt with a cost factor
            suitable for production use.{'\n'}
            • Hotel-level data isolation is enforced at the database layer —
            employees can only access data belonging to their own hotel.{'\n'}
            • Rate limiting is applied to authentication and sensitive actions.
          </Body>
        </Section>

        <Section title="9. Your Rights">
          <Body>
            Depending on your jurisdiction, you may have the right to:{'\n'}
            {'\n'}
            • <Text style={s.bold}>Access</Text> a copy of the personal data we hold
            about you.{'\n'}
            • <Text style={s.bold}>Correct</Text> inaccurate personal data (contact
            your HR administrator or us directly).{'\n'}
            • <Text style={s.bold}>Delete</Text> your account and associated data.
            Contact {CONTACT_EMAIL} or your HR administrator to request deletion.
            Note that your employer may be required to retain certain records.{'\n'}
            • <Text style={s.bold}>Object</Text> to certain processing activities.{'\n'}
            • <Text style={s.bold}>Portability</Text> — request your data in a
            structured, machine-readable format.
          </Body>
          <Body>
            To exercise any of these rights, email us at {CONTACT_EMAIL} with the
            subject "Data Rights Request".
          </Body>
        </Section>

        <Section title="10. Account Deletion">
          <Body>
            You can delete your IndabaCares account directly within the App:
          </Body>
          <Body>
            1. Go to <Text style={s.bold}>Settings → Delete Account</Text>.{'\n'}
            2. Type the confirmation phrase and enter your password.{'\n'}
            3. Tap <Text style={s.bold}>Delete My Account</Text>.
          </Body>
          <Body>
            Your personal data (name, photo, mood history, sessions, push tokens,
            and reaction history) is permanently removed immediately. Recognitions
            you have sent are anonymised. Pending reward orders are cancelled and
            points refunded. Approved or fulfilled orders are retained for
            fulfilment records.
          </Body>
          <Body>
            Alternatively, you may request deletion by emailing {CONTACT_EMAIL}
            with the subject "Account Deletion Request". Email requests are
            processed within 30 days.
          </Body>
        </Section>

        <Section title="11. Children">
          <Body>
            IndabaCares is intended exclusively for use by employees aged 18 and over.
            We do not knowingly collect data from individuals under 18.
          </Body>
        </Section>

        <Section title="12. Changes to This Policy">
          <Body>
            We may update this Privacy Policy from time to time. We will notify you of
            significant changes via an in-app announcement. Continued use of the App
            after the updated policy takes effect constitutes your acceptance.
          </Body>
        </Section>

        <Section title="13. Contact">
          <Body>
            For any privacy-related questions or requests:
          </Body>
          <TouchableOpacity onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}>
            <Text style={s.link}>{CONTACT_EMAIL}</Text>
          </TouchableOpacity>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SubHeading({ children }: { children: string }) {
  return <Text style={s.subHeading}>{children}</Text>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: PURPLE },
  scroll: { flex: 1, backgroundColor: '#fff' },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 48 },

  header: {
    backgroundColor: PURPLE,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },

  lastUpdated: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 24,
    fontStyle: 'italic',
  },

  section:      { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e1b4b', marginBottom: 8 },
  subHeading:   { fontSize: 14, fontWeight: '600', color: '#4c1d95', marginTop: 10, marginBottom: 4 },
  body:         { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 8 },
  bold:         { fontWeight: '600' },
  link:         { fontSize: 14, color: PURPLE, textDecorationLine: 'underline', marginTop: 4 },
});
