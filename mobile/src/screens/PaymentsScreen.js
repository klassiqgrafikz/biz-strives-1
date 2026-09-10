import React, { useState } from 'react'
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native'
import {
  Text,
  Card,
  List,
  Button,
  FAB,
  Snackbar,
  Portal,
  Dialog,
  TextInput,
  Menu,
  Divider,
} from 'react-native-paper'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import { LoadingSpinner } from '../components/EmptyState'
import { COLORS, PAYMENT_METHODS } from '../utils/constants'
import { fmtNaira, fmtDateShort, todayStr, methodLabel } from '../utils/format'

const emptyForm = { customer_id: '', amount: '', method: 'bank_transfer', note: '', date: todayStr() }

export default function PaymentsScreen() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const paymentsQuery = useQuery({ queryKey: ['payments'], queryFn: () => api.get('/api/payments') })
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api.get('/api/customers') })

  function invalidateAll() {
    queryClient.invalidateQueries(['payments'])
    queryClient.invalidateQueries(['dashboard'])
    queryClient.invalidateQueries(['reports'])
  }

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/payments', payload),
    onSuccess: invalidateAll,
  })
  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/api/payments/${editing.id}`, payload),
    onSuccess: invalidateAll,
  })
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/payments/${deleteTarget.id}`),
    onSuccess: () => {
      invalidateAll()
      setDeleteTarget(null)
    },
  })

  const customers = customersQuery.isSuccess
    ? customersQuery.data.data.filter((c) => c.active)
    : []

  function openAdd() {
    setEditing(null)
    setForm({
      ...emptyForm,
      customer_id: editing ? '' : (customers[0]?.id || ''),
    })
    setShowModal(true)
  }

  function openEdit(p) {
    setEditing(p)
    setForm({
      customer_id: p.customer_id || '',
      amount: String((p.amount_cents || 0) / 100),
      method: p.method || 'bank_transfer',
      note: p.note || '',
      date: fmtDateShort(p.received_at) || todayStr(),
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.amount) {
      setError('Amount is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        customer_id: form.customer_id || null,
        amount: parseFloat(form.amount),
        method: form.method,
        note: form.note || undefined,
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

  if (paymentsQuery.isLoading) return <LoadingSpinner text="Loading payments..." />

  const payments = paymentsQuery.data.data

  return (
    <View style={styles.flex}>
      <FlatList
        data={payments}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await paymentsQuery.refetch()
              setRefreshing(false)
            }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No payments recorded yet.</Text>}
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <Card.Title
              title={item.customer_name || 'Manual'}
              subtitle={`${fmtDateShort(item.received_at)} • ${methodLabel(item.method)}${item.note ? ` • ${item.note}` : ''}`}
              left={(p) => <List.Icon {...p} icon="cash" color={COLORS.accent} />}
            />
            <Card.Content>
              <View style={styles.cardActions}>
                <Text style={styles.amount}>+{fmtNaira(item.amount_cents)}</Text>
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

      <PaymentModal
        visible={showModal}
        onDismiss={() => setShowModal(false)}
        onSave={handleSave}
        title={editing ? 'Edit Payment' : 'Record Payment'}
        saving={saving}
        form={form}
        setForm={setForm}
        customers={customers}
        isEdit={!!editing}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Payment"
        message={`Delete this payment of ${deleteTarget ? fmtNaira(deleteTarget.amount_cents) : ''}?`}
      />
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>
    </View>
  )
}

function PaymentModal({ visible, onDismiss, onSave, title, saving, form, setForm, customers, isEdit }) {
  const [showCustomerMenu, setShowCustomerMenu] = useState(false)
  const [showMethodMenu, setShowMethodMenu] = useState(false)

  const selectedCustomer = customers.find((c) => c.id === form.customer_id)
  const selectedMethod = PAYMENT_METHODS.find((m) => m.value === form.method)

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <View style={styles.modalContent}>
            {!isEdit && !customers.length ? (
              <Text style={styles.warn}>Add a customer first to record payments against them.</Text>
            ) : (
              <Menu
                visible={showCustomerMenu}
                onDismiss={() => setShowCustomerMenu(false)}
                anchor={
                  <TextInput
                    label="Customer"
                    value={selectedCustomer ? selectedCustomer.name : '(none)'}
                    mode="outlined"
                    style={styles.input}
                    onFocus={() => setShowCustomerMenu(true)}
                    right={<TextInput.Icon icon="chevron-down" />}
                  />
                }
              >
                {customers.map((c) => (
                  <Menu.Item
                    key={c.id}
                    title={`${c.name} (${c.email})`}
                    onPress={() => {
                      setForm({ ...form, customer_id: c.id })
                      setShowCustomerMenu(false)
                    }}
                  />
                ))}
              </Menu>
            )}

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

            <Menu
              visible={showMethodMenu}
              onDismiss={() => setShowMethodMenu(false)}
              anchor={
                <TextInput
                  label="Method"
                  value={selectedMethod ? selectedMethod.label : form.method}
                  mode="outlined"
                  style={styles.input}
                  onFocus={() => setShowMethodMenu(true)}
                  right={<TextInput.Icon icon="chevron-down" />}
                />
              }
            >
              {PAYMENT_METHODS.map((m) => (
                <Menu.Item
                  key={m.value}
                  title={m.label}
                  onPress={() => {
                    setForm({ ...form, method: m.value })
                    setShowMethodMenu(false)
                  }}
                />
              ))}
            </Menu>

            <TextInput
              label="Note"
              value={form.note}
              onChangeText={(v) => setForm({ ...form, note: v })}
              mode="outlined"
              style={styles.input}
            />
          </View>
        </Dialog.ScrollArea>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button mode="contained" loading={saving} disabled={saving} onPress={onSave}>
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
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
    color: COLORS.accent,
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
  warn: {
    color: COLORS.warning,
    marginBottom: 12,
  },
})