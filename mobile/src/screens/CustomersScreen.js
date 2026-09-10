import React, { useState } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import { Text, Card, List, Button, TextInput, Chip, FAB, Snackbar } from 'react-native-paper'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import CrudModal from '../components/CrudModal'
import { LoadingSpinner } from '../components/EmptyState'
import { COLORS } from '../utils/constants'
import { fmtDateShort, todayStr } from '../utils/format'

const emptyForm = { name: '', email: '', phone: '', birthday: '', active: true }

export default function CustomersScreen() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const query = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/api/customers') })

  function invalidate() {
    queryClient.invalidateQueries(['customers'])
    queryClient.invalidateQueries(['payments'])
    queryClient.invalidateQueries(['notifications'])
  }

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/customers', payload),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/api/customers/${editing.id}`, payload),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/customers/${deleteTarget.id}`),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
    },
  })

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  function openEdit(c) {
    setEditing(c)
    setForm({
      name: c.name || '',
      email: c.email || '',
      phone: c.phone || '',
      birthday: c.birthday ? c.birthday.slice(0, 10) : '',
      active: !!c.active,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name || !form.email) {
      setError('Name and email are required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        birthday: form.birthday || undefined,
        active: form.active,
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

  if (query.isLoading) return <LoadingSpinner text="Loading customers..." />

  const customers = query.data.data

  return (
    <View style={styles.flex}>
      <FlatList
        data={customers}
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
        ListEmptyComponent={<Text style={styles.empty}>No customers yet. Tap + to add one.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title
              title={item.name}
              subtitle={[item.email, item.phone].filter(Boolean).join(' • ')}
              left={(p) => <List.Icon {...p} icon="account" color={COLORS.primary} />}
              right={(p) => (
                <View style={styles.rowRight}>
                  <Chip
                    style={item.active ? styles.activeChip : styles.inactiveChip}
                    textStyle={{ fontSize: 11 }}
                  >
                    {item.active ? 'Active' : 'Inactive'}
                  </Chip>
                </View>
              )}
            />
            <Card.Content>
              <View style={styles.cardActions}>
                <View style={styles.cardActions}>
                  <Text style={styles.birthdayText}>
                    {item.birthday ? `Born: ${fmtDateShort(item.birthday)}` : ''}
                  </Text>
                </View>
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
      <CrudModal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        onSave={handleSave}
        title={editing ? 'Edit Customer' : 'Add Customer'}
        saving={saving}
        form={form}
        setForm={setForm}
        fields={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email', keyboardType: 'email-address' },
          { key: 'phone', label: 'Phone' },
          { key: 'birthday', label: 'Birthday (YYYY-MM-DD)' },
        ]}
      />
      <ConfirmDialog
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Customer"
        message={`Delete ${deleteTarget?.name || 'this customer'}? This cannot be undone.`}
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
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },
  activeChip: {
    backgroundColor: '#F0FDF4',
  },
  inactiveChip: {
    backgroundColor: COLORS.background,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  birthdayText: {
    color: COLORS.muted,
    fontSize: 12,
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
})