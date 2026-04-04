import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const PURPLE = '#7C3AED';
const LAST_UPDATED = 'April 2025';

export default function TermsOfServiceScreen() {
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Terms of Service</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.lastUpdated}>Last updated: {LAST_UPDATED}</Text>

        <Section title="1. Agreement to Terms">
          <Body>
            By accessing or using IndabaCares ("the App"), you agree to be bound by
            these Terms of Service. If you do not agree, do not use the App.{'\n'}
            {'\n'}
            These Terms govern your use of IndabaCares in your capacity as an employee
            of a hotel or hospitality property that has licensed the platform. Your
            employer has agreed to separate terms with Indaba Cares (Pty) Ltd.
          </Body>
        </Section>

        <Section title="2. Eligibility">
          <Body>
            The App is available only to employees who have been registered in the
            system by their employer. You must be at least 18 years old to use the App.
            Your employer is responsible for ensuring that only eligible employees
            are registered.
          </Body>
        </Section>

        <Section title="3. Your Account">
          <Body>
            • Your employee code and password are personal and must not be shared.{'\n'}
            • You are responsible for all activity that occurs under your account.{'\n'}
            • You must notify your HR administrator immediately if you suspect
            unauthorised access to your account.{'\n'}
            • You may not create an account on behalf of another person.
          </Body>
        </Section>

        <Section title="4. Acceptable Use">
          <Body>
            You agree NOT to use the App to:{'\n'}
            {'\n'}
            • Post recognition messages or chat content that is abusive, discriminatory,
            sexually explicit, threatening, or defamatory.{'\n'}
            • Harass, intimidate, or bully any colleague.{'\n'}
            • Misrepresent your identity or impersonate another employee.{'\n'}
            • Attempt to access another employee's account or data.{'\n'}
            • Interfere with the App's functionality or security systems.{'\n'}
            • Use the App for any unlawful purpose.{'\n'}
            • Upload content to which you do not have the right to grant us a licence.
          </Body>
        </Section>

        <Section title="5. Recognition & Points">
          <Body>
            • Points earned through recognition are a reward mechanism provided at
            your employer's discretion and have no cash value.{'\n'}
            • Your employer retains the right to modify, suspend, or terminate the
            points and rewards programme at any time.{'\n'}
            • Points cannot be transferred between employees, converted to cash, or
            used outside of the IndabaCares platform.{'\n'}
            • Fraudulent manipulation of points or recognition submissions may result
            in account suspension and disciplinary action.
          </Body>
        </Section>

        <Section title="6. Rewards Redemption">
          <Body>
            • Reward availability is subject to stock and your employer's budget.{'\n'}
            • All redemptions are subject to approval by your employer's
            administration team.{'\n'}
            • Your employer is responsible for fulfilling approved redemptions.
            Indaba Cares (Pty) Ltd is not responsible for reward fulfilment.{'\n'}
            • Approved and fulfilled redemptions cannot be reversed except at the
            sole discretion of your employer.
          </Body>
        </Section>

        <Section title="7. Content You Post">
          <Body>
            You retain ownership of content you submit (recognition messages, chat
            messages, profile photos). By posting content, you grant Indaba Cares
            (Pty) Ltd and your employer a non-exclusive, royalty-free licence to
            display that content within the platform.{'\n'}
            {'\n'}
            You are solely responsible for the content you post. We may remove any
            content that violates these Terms or applicable law.
          </Body>
        </Section>

        <Section title="8. Intellectual Property">
          <Body>
            The App, its design, logos, and software are owned by or licenced to
            Indaba Cares (Pty) Ltd. Nothing in these Terms grants you ownership of
            any intellectual property rights in the App.
          </Body>
        </Section>

        <Section title="9. Availability">
          <Body>
            We aim to keep the App available at all times but do not guarantee
            uninterrupted access. We may suspend, modify, or discontinue the App
            or any features at any time with or without notice.
          </Body>
        </Section>

        <Section title="10. Limitation of Liability">
          <Body>
            To the maximum extent permitted by law, Indaba Cares (Pty) Ltd is not
            liable for any indirect, incidental, special, or consequential damages
            arising from your use of the App, including lost points, unavailable
            rewards, or data loss.
          </Body>
        </Section>

        <Section title="11. Account Termination">
          <Body>
            Your access to the App is tied to your employment. Your employer may
            deactivate your account at any time, including upon termination of your
            employment. You may request deletion of your account and personal data
            at any time via Settings → Delete Account.
          </Body>
        </Section>

        <Section title="12. Changes to These Terms">
          <Body>
            We may update these Terms from time to time. Significant changes will be
            communicated via an in-app notification. Continued use of the App after
            the updated Terms take effect constitutes your acceptance.
          </Body>
        </Section>

        <Section title="13. Governing Law">
          <Body>
            These Terms are governed by the laws of the Republic of South Africa.
            Any disputes will be subject to the jurisdiction of the South African
            courts.
          </Body>
        </Section>

        <Section title="14. Contact">
          <Body>
            Questions about these Terms: legal@indabacares.com
          </Body>
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ children }: { children: React.ReactNode }) {
  return <Text style={s.body}>{children}</Text>;
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: PURPLE },
  scroll:  { flex: 1, backgroundColor: '#fff' },
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

  lastUpdated: { fontSize: 12, color: '#94a3b8', marginBottom: 24, fontStyle: 'italic' },
  section:     { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e1b4b', marginBottom: 8 },
  body:        { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 8 },
});
