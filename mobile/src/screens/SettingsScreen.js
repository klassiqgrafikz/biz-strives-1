import React, { useState, useEffect } from 'react'
import { View, StyleSheet, ScrollView, Linking } from 'react-native'
import { Text, Card, Button, TextInput, Divider, Snackbar, ActivityIndicator } from 'react-native-paper'
import * as WebBrowser from 'expo-web-browser'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import { LoadingSpinner } from '../components/EmptyState'
import { COLORS } from '../utils/constants'
import { maskAccount } from '../utils/format'

export default function SettingsScreen() {
  const queryClient = useQueryClient()
  const query = useQuery({ queryKey: ['settings'], queryFn: () => api.get('/api/settings') })

  const [form, setForm] = useState(null)
  const [saved, setSaved] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [showAppPassword, setShowAppPassword] = useState(false)
  const [showClientSecret, setShowClientSecret] = useState(false)

  useEffect(() => {
    if (query.isSuccess && !form) {
      const s = query.data.data
      setForm({
        business_name: s.business_name || '',
        brand_name: s.brand_name || 'BizStrives',
        tagline: s.tagline || '',
        statement_email: s.statement_email || '',
        account_number: s.account_number || '',
        opening_balance_cents: s.opening_balance_cents || '',
        timezone: s.timezone || 'Africa/Lagos',
        statement_day: s.statement_day || '1',
        statement_time: s.statement_time || '21:00',
        gmail_user: s.gmail_user || '',
        gmail_app_password: '',
        gmail_client_id: s.gmail_client_id || '',
        gmail_client_secret: '',
      })
    }
  }, [query.isSuccess])

  const saveMutation = useMutation({
    mutationFn: (payload) => api.put('/api/settings', payload),
    onSuccess: () => {
      queryClient.invalidateQueries(['settings'])
      setForm(null)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
  })

  const testEmailMutation = useMutation({
    mutationFn: () => api.post('/api/settings/test-email', {}),
  })

  if (!form) {
    if (query.isLoading) return <LoadingSpinner text="Loading settings..." />
    if (query.isError) return <Text style={styles.error}>Failed to load settings: {query.error.message}</Text>
  }

  const settings = query.data.data

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setError('')
    try {
      const payload = { ...form }
      if (!payload.gmail_app_password) delete payload.gmail_app_password
      if (!payload.gmail_client_secret) delete payload.gmail_client_secret
      if (payload.opening_balance_cents) {
        payload.opening_balance_cents = Math.round(parseFloat(payload.opening_balance_cents) * 100)
      } else {
        delete payload.opening_balance_cents
      }
      payload.statement_day = payload.statement_day ? parseInt(payload.statement_day, 10) : undefined
      await saveMutation.mutateAsync(payload)
    } catch (err) {
      setError(err.message || 'Save failed')
    }
  }

  async function handleTestEmail() {
    setTesting(true)
    setTestResult('')
    setError('')
    try {
      await testEmailMutation.mutateAsync()
      setTestResult('Test email sent successfully!')
    } catch (err) {
      setTestResult('')
      setError(err.message || 'Test email failed')
    } finally {
      setTesting(false)
    }
  }

  async function handleConnectOAuth() {
    setConnecting(true)
    setError('')
    try {
      const res = await api.get('/api/settings/oauth/url')
      await WebBrowser.openBrowserAsync(res.url)
    } catch (err) {
      setError(err.message || 'OAuth setup failed')
    } finally {
      setConnecting(false)
    }
  }

  const connected = settings.gmail_api_connected

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Card.Title title="Business Info" titleVariant="titleMedium" />
          <Divider />
          <Card.Content>
            <TextInput label="Business Name" value={form.business_name} onChangeText={(v) => set('business_name', v)} mode="outlined" style={styles.input} />
            <TextInput label="Brand Name" value={form.brand_name} onChangeText={(v) => set('brand_name', v)} mode="outlined" style={styles.input} />
            <TextInput label="Tagline" value={form.tagline} onChangeText={(v) => set('tagline', v)} mode="outlined" style={styles.input} />
            <TextInput label="Statement Email" value={form.statement_email} onChangeText={(v) => set('statement_email', v)} mode="outlined" keyboardType="email-address" style={styles.input} />
            <TextInput label="Account Number (for PDF statement)" value={form.account_number} onChangeText={(v) => set('account_number', v)} mode="outlined" style={styles.input} />
            <TextInput
              label="Opening Balance (NGN)"
              value={String(form.opening_balance_cents || '')}
              onChangeText={(v) => set('opening_balance_cents', v)}
              mode="outlined"
              keyboardType="decimal-pad"
              style={styles.input}
              placeholder="e.g. 500000"
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Email (Gmail SMTP)" titleVariant="titleMedium" />
          <Divider />
          <Card.Content>
            <TextInput label="Gmail Address" value={form.gmail_user} onChangeText={(v) => set('gmail_user', v)} mode="outlined" keyboardType="email-address" style={styles.input} />
            <TextInput
              label="Gmail App Password"
              value={form.gmail_app_password}
              onChangeText={(v) => set('gmail_app_password', v)}
              mode="outlined"
              secureTextEntry={!showAppPassword}
              style={styles.input}
              right={(
                <TextInput.Icon
                  icon={showAppPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowAppPassword((v) => !v)}
                />
              )}
            />
            <Text
              style={styles.link}
              onPress={() => Linking.openURL('https://myaccount.google.com/apppasswords')}
            >
              Generate app passwords at Google
            </Text>
            <Button
              mode="outlined"
              loading={testing}
              disabled={testing}
              onPress={handleTestEmail}
              style={styles.button}
            >
              Send Test Email
            </Button>
            {!!testResult && <Text style={styles.success}>{testResult}</Text>}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Gmail API (Google OAuth)" titleVariant="titleMedium" />
          <Divider />
          <Card.Content>
            <Text style={[styles.statusText, connected ? styles.connected : styles.notConnected]}>
              {connected ? 'Connected to Gmail API' : 'Not connected — OAuth setup required'}
            </Text>
            <TextInput label="Gmail Client ID" value={form.gmail_client_id} onChangeText={(v) => set('gmail_client_id', v)} mode="outlined" style={styles.input} />
            <TextInput
              label="Gmail Client Secret"
              value={form.gmail_client_secret}
              onChangeText={(v) => set('gmail_client_secret', v)}
              mode="outlined"
              secureTextEntry={!showClientSecret}
              style={styles.input}
              right={(
                <TextInput.Icon
                  icon={showClientSecret ? 'eye-off' : 'eye'}
                  onPress={() => setShowClientSecret((v) => !v)}
                />
              )}
            />
            <Button
              mode="outlined"
              icon="google"
              loading={connecting}
              disabled={connecting}
              onPress={handleConnectOAuth}
              style={styles.button}
            >
              Connect Gmail API
            </Button>
            <Text style={styles.hint}>
              Set the OAuth redirect URI to https://biz-strives-api.onrender.com/api/settings/oauth/callback in Google Cloud.
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Scheduling" titleVariant="titleMedium" />
          <Divider />
          <Card.Content>
            <TextInput label="Timezone" value={form.timezone} onChangeText={(v) => set('timezone', v)} mode="outlined" style={styles.input} />
            <TextInput label="Statement Day of Month (1-28)" value={String(form.statement_day)} onChangeText={(v) => set('statement_day', v)} mode="outlined" keyboardType="number-pad" style={styles.input} />
            <TextInput label="Statement Time" value={form.statement_time} onChangeText={(v) => set('statement_time', v)} mode="outlined" style={styles.input} placeholder="21:00" />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Current Configuration" titleVariant="titleMedium" />
          <Divider />
          <Card.Content>
            <ConfigRow label="Account Number" value={maskAccount(settings.account_number)} />
            <ConfigRow label="Email Connected" value={connected ? 'Yes' : 'No'} />
            <ConfigRow label="Statement" value={`${settings.statement_day} @ ${settings.statement_time}`} />
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          buttonColor={COLORS.primary}
          loading={saveMutation.isPending}
          disabled={saveMutation.isPending}
          onPress={handleSave}
          style={styles.saveBtn}
        >
          Save Settings
        </Button>
      </ScrollView>

      <Snackbar visible={!!saved} onDismiss={() => setSaved(false)} duration={2500}>
        Settings saved successfully!
      </Snackbar>
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>
    </View>
  )
}

function ConfigRow({ label, value }) {
  return (
    <View style={styles.configRow}>
      <Text style={styles.configLabel}>{label}</Text>
      <Text style={styles.configValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  input: {
    marginTop: 12,
    backgroundColor: COLORS.surface,
  },
  button: {
    marginTop: 12,
    borderRadius: 8,
  },
  link: {
    color: COLORS.primary,
    fontSize: 13,
    marginTop: 4,
  },
  success: {
    color: COLORS.accent,
    marginTop: 12,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  connected: {
    color: COLORS.accent,
  },
  notConnected: {
    color: COLORS.danger,
  },
  hint: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 12,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  configLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  configValue: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    borderRadius: 8,
  },
  error: {
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: 40,
  },
})