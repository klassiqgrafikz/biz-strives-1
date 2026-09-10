import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, List, Button, Snackbar, Portal, Dialog, TextInput, Divider, Chip } from 'react-native-paper'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import { LoadingSpinner } from '../components/EmptyState'
import { COLORS, TEMPLATE_TYPES, DEFAULT_TEMPLATES } from '../utils/constants'
import { fmtDate, fmtTime } from '../utils/format'
import { downloadStatementPdf } from '../utils/pdf'

const emptyForm = { name: '', subject: '', body: '', type: 'monthly_statement' }

export default function MessagesScreen() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmClearLog, setConfirmClearLog] = useState(false)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const templatesQuery = useQuery({ queryKey: ['templates'], queryFn: () => api.get('/api/templates') })
  const logQuery = useQuery({ queryKey: ['messages', 'log'], queryFn: () => api.get('/api/messages/log') })

  function invalidateAll() {
    queryClient.invalidateQueries(['templates'])
    queryClient.invalidateQueries(['messages', 'log'])
  }

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/templates', payload),
    onSuccess: invalidateAll,
  })
  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/api/templates/${editing.id}`, payload),
    onSuccess: invalidateAll,
  })
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/templates/${deleteTarget.id}`),
    onSuccess: () => {
      invalidateAll()
      setDeleteTarget(null)
    },
  })
  const clearLogMutation = useMutation({
    mutationFn: () => api.delete('/api/messages/log'),
    onSuccess: () => {
      invalidateAll()
      setConfirmClearLog(false)
    },
  })

  function openAdd() {
    setEditing(null)
    setForm({ ...emptyForm, ...DEFAULT_TEMPLATES.monthly_statement })
    setShowModal(true)
  }

  function openEdit(t) {
    setEditing(t)
    setForm({ name: t.name || '', subject: t.subject || '', body: t.body || '', type: t.type || 'monthly_statement' })
    setShowModal(true)
  }

  function handleTypeChange(type) {
    const defaults = DEFAULT_TEMPLATES[type] || {}
    setForm((f) =>
      editing
        ? { ...f, type }
        : { ...f, type, name: defaults.name || f.name, subject: defaults.subject || f.subject, body: defaults.body || f.body }
    )
  }

  async function handleSave() {
    if (!form.name || !form.subject || !form.body) {
      setError('All fields are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { name: form.name, subject: form.subject, body: form.body, type: form.type }
      if (editing) {
        await updateMutation.mutateAsync(payload)
      } else {
        await createMutation.mutateAsync(payload)
      }
      setShowModal(false)
    } catch (err) {
      setError(err.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleDownload() {
    setDownloading(true)
    setError('')
    try {
      await downloadStatementPdf('', 'statement.pdf')
    } catch (err) {
      setError(err.message || 'Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (templatesQuery.isLoading || logQuery.isLoading) return <LoadingSpinner text="Loading messages..." />

  const templates = templatesQuery.data.data
  const log = logQuery.data.data

  return (
    <View style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await Promise.all([templatesQuery.refetch(), logQuery.refetch()])
              setRefreshing(false)
            }}
          />
        }
      >
        <Card style={styles.card}>
          <Card.Title
            title="Message Templates"
            titleVariant="titleMedium"
            right={() => <Button icon="plus" onPress={openAdd}>Add</Button>}
          />
          <Card.Content>
            {templates.length === 0 ? (
              <Text style={styles.empty}>No templates yet.</Text>
            ) : (
              templates.map((t, i) => (
                <View key={t.id}>
                  {i > 0 && <Divider />}
                  <List.Item
                    title={t.name}
                    description={`${t.subject}\n${t.body.replace(/\{/g, '{').slice(0, 60)}...`}
                    right={() => (
                      <View style={styles.rowRight}>
                        <Button compact icon="pencil" onPress={() => openEdit(t)}>Edit</Button>
                        <Button compact icon="delete" textColor={COLORS.danger} onPress={() => setDeleteTarget(t)}>
                          Delete
                        </Button>
                      </View>
                    )}
                  />
                </View>
              ))
            )}
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title title="Automation Schedule" titleVariant="titleMedium" />
          <Card.Content>
            <InfoRow icon="email" color={COLORS.primary} text="Monthly Statement — last day of month at 9:00 PM" />
            <InfoRow icon="cake" color={COLORS.warning} text="Birthday Messages — daily at 8:00 AM" />
            <InfoRow icon="piggy-bank" color={COLORS.accent} text="Savings Reminder — every Friday at 6:00 PM" />
            <Button
              mode="outlined"
              icon="download"
              loading={downloading}
              disabled={downloading}
              onPress={handleDownload}
              style={styles.downloadBtn}
            >
              Download Current PDF Statement
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title
            title="Recent Messages"
            titleVariant="titleMedium"
            subtitle={`${log.length} sent recently`}
            right={() =>
              log.length > 0 ? (
                <Button compact textColor={COLORS.danger} onPress={() => setConfirmClearLog(true)}>
                  Delete All
                </Button>
              ) : undefined
            }
          />
          <Card.Content>
            {log.length === 0 ? (
              <Text style={styles.empty}>No messages sent yet.</Text>
            ) : (
              log.map((m, i) => (
                <View key={m.id}>
                  {i > 0 && <Divider />}
                  <List.Item
                    title={m.customer_name || 'Unknown'}
                    description={`${m.type} • ${fmtDate(m.sent_at)} ${fmtTime(m.sent_at)}`}
                    left={(p) => (
                      <List.Icon {...p} icon="send" color={m.status === 'sent' ? COLORS.accent : COLORS.danger} />
                    )}
                  />
                </View>
              ))
            )}
          </Card.Content>
        </Card>
      </ScrollView>

      <Portal>
        <Dialog visible={showModal} onDismiss={() => setShowModal(false)} style={styles.dialog}>
          <Dialog.Title>{editing ? 'Edit Template' : 'Add Template'}</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <View style={styles.modalContent}>
              <TextInput
                label="Name"
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Subject"
                value={form.subject}
                onChangeText={(v) => setForm({ ...form, subject: v })}
                mode="outlined"
                style={styles.input}
              />
              <View style={styles.chipRow}>
                {TEMPLATE_TYPES.map((t) => (
                  <Chip
                    key={t.value}
                    selected={form.type === t.value}
                    onPress={() => handleTypeChange(t.value)}
                    style={styles.chip}
                  >
                    {t.label}
                  </Chip>
                ))}
              </View>
              <TextInput
                label="Body"
                value={form.body}
                onChangeText={(v) => setForm({ ...form, body: v })}
                mode="outlined"
                multiline
                numberOfLines={6}
                style={styles.input}
              />
              <Text style={styles.placeholders}>
                Available: {'{name}'} {'{brand}'} {'{month}'} {'{total_received}'} {'{total_spent}'} {'{total_saved}'} {'{net_cash}'}
              </Text>
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor={COLORS.primary} loading={saving} disabled={saving} onPress={handleSave}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Template"
        message={`Delete template "${deleteTarget?.name || ''}"?`}
      />

      <ConfirmDialog
        visible={confirmClearLog}
        onDismiss={() => setConfirmClearLog(false)}
        onConfirm={() => clearLogMutation.mutate()}
        title="Clear Message Log"
        message="Delete all sent-message history? This cannot be undone."
      />

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>
    </View>
  )
}

function InfoRow({ icon, color, text }) {
  return (
    <View style={styles.infoRow}>
      <List.Icon icon={icon} color={color} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    marginLeft: 4,
  },
  downloadBtn: {
    marginTop: 12,
    borderRadius: 8,
  },
  dialog: {
    maxHeight: '85%',
  },
  scrollArea: {
    maxHeight: 500,
  },
  modalContent: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
    marginBottom: 8,
  },
  placeholders: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },
})