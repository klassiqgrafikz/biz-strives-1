import React, { useState } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { Text, Card, List, Button, FAB, Snackbar, Portal, Dialog, TextInput } from 'react-native-paper'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import { LoadingSpinner } from '../components/EmptyState'
import { COLORS } from '../utils/constants'
import { fmtNaira, fmtDateShort, todayStr } from '../utils/format'

const emptyForm = { category: '', amount: '', description: '', date: todayStr() }

export default function ExpensesScreen() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const query = useQuery({ queryKey: ['expenses'], queryFn: () => api.get('/api/expenses') })

  function invalidateAll() {
    queryClient.invalidateQueries(['expenses'])
    queryClient.invalidateQueries(['dashboard'])
    queryClient.invalidateQueries(['reports'])
  }

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/expenses', payload),
    onSuccess: invalidateAll,
  })
  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/api/expenses/${editing.id}`, payload),
    onSuccess: invalidateAll,
  })
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/expenses/${deleteTarget.id}`),
    onSuccess: () => {
      invalidateAll()
      setDeleteTarget(null)
    },
  })

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(e) {
    setEditing(e)
    setForm({
      category: e.category || '',
      amount: String((e.amount_cents || 0) / 100),
      description: e.description || '',
      date: fmtDateShort(e.spent_at) || todayStr(),
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.category || !form.amount) {
      setError('Category and amount are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description || undefined,
        date: form.date,
      }
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

  if (query.isLoading) return <LoadingSpinner text="Loading expenses..." />

  const expenses = query.data.data

  return (
    <View style={styles.flex}>
      <FlatList
        data={expenses}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await query.refetch()
              setRefreshing(false)
            }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No expenses recorded yet.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title
              title={item.category}
              subtitle={`${fmtDateShort(item.spent_at)}${item.description ? ` • ${item.description}` : ''}`}
              left={(p) => <List.Icon {...p} icon="receipt" color={COLORS.danger} />}
            />
            <Card.Content>
              <View style={styles.cardActions}>
                <Text style={styles.amount}>-{fmtNaira(item.amount_cents)}</Text>
                <View style={styles.rowRight}>
                  <Button compact icon="pencil" onPress={() => openEdit(item)}>Edit</Button>
                  <Button compact icon="delete" textColor={COLORS.danger} onPress={() => setDeleteTarget(item)}>
                    Delete
                  </Button>
                </View>
              </View>
            </Card.Content>
          </Card>
        )}
      />
      <FAB icon="plus" style={styles.fab} color="#fff" onPress={openAdd} />

      <Portal>
        <Dialog visible={showModal} onDismiss={() => setShowModal(false)} style={styles.dialog}>
          <Dialog.Title>{editing ? 'Edit Expense' : 'Add Expense'}</Dialog.Title>
          <Dialog.ScrollArea style={styles.scrollArea}>
            <View style={styles.modalContent}>
              <TextInput
                label="Category"
                value={form.category}
                onChangeText={(v) => setForm({ ...form, category: v })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Amount (NGN)"
                value={form.amount}
                onChangeText={(v) => setForm({ ...form, amount: v })}
                mode="outlined"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <TextInput
                label="Date (YYYY-MM-DD)"
                value={form.date}
                onChangeText={(v) => setForm({ ...form, date: v })}
                mode="outlined"
                style={styles.input}
              />
              <TextInput
                label="Description"
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
              />
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowModal(false)}>Cancel</Button>
            <Button mode="contained" buttonColor={COLORS.danger} loading={saving} disabled={saving} onPress={handleSave}>
              Save
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <ConfirmDialog
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Expense"
        message={`Delete this expense of ${deleteTarget ? fmtNaira(deleteTarget.amount_cents) : ''}?`}
      />
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 16, paddingBottom: 96 },
  card: {
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    backgroundColor: COLORS.primary,
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 40,
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
})