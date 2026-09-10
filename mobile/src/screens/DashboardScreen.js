import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Text, Card, List, Button, TextInput, Divider } from 'react-native-paper'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import StatCard from '../components/StatCard'
import ConfirmDialog from '../components/ConfirmDialog'
import CrudModal from '../components/CrudModal'
import { LoadingSpinner } from '../components/EmptyState'
import { COLORS } from '../utils/constants'
import { fmtNaira, fmtDateShort, todayStr, methodLabel } from '../utils/format'

export default function DashboardScreen() {
  const queryClient = useQueryClient()
  const [incomeForm, setIncomeForm] = useState({ amount: '', note: '', date: todayStr() })
  const [incomeSaving, setIncomeSaving] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({ amount: '', note: '', date: todayStr() })
  const [editSaving, setEditSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [refreshing, setRefreshing] = useState(false)

  const statsQuery = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/api/dashboard') })
  const paymentsQuery = useQuery({ queryKey: ['payments', 5], queryFn: () => api.get('/api/payments?limit=5') })
  const expensesQuery = useQuery({ queryKey: ['expenses', 5], queryFn: () => api.get('/api/expenses?limit=5') })

  function refreshAll() {
    queryClient.invalidateQueries(['dashboard'])
    queryClient.invalidateQueries(['payments'])
    queryClient.invalidateQueries(['expenses'])
    queryClient.invalidateQueries(['savings'])
  }

  const incomeMutation = useMutation({
    mutationFn: (payload) => api.post('/api/payments/income', payload),
    onSuccess: () => {
      refreshAll()
      setIncomeForm({ amount: '', note: '', date: todayStr() })
    },
  })

  const editMutation = useMutation({
    mutationFn: (payload) => api.put(`/api/payments/${editing.id}`, payload),
    onSuccess: () => {
      refreshAll()
      setEditModal(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/payments/${deleteTarget.id}`),
    onSuccess: () => {
      refreshAll()
      setDeleteTarget(null)
    },
  })

  async function handleAddIncome() {
    if (!incomeForm.amount) return
    setIncomeSaving(true)
    try {
      await incomeMutation.mutateAsync({
        amount: parseFloat(incomeForm.amount),
        note: incomeForm.note,
        received_at: incomeForm.date,
      })
      setIncomeForm({ amount: '', note: '', date: todayStr() })
    } finally {
      setIncomeSaving(false)
    }
  }

  function openEdit(p) {
    setEditing(p)
    setEditForm({
      amount: String((p.amount_cents || 0) / 100),
      note: p.note || '',
      date: fmtDateShort(p.received_at) || todayStr(),
    })
    setEditModal(true)
  }

  async function handleSaveEdit() {
    if (!editing || !editForm.amount) return
    setEditSaving(true)
    try {
      await editMutation.mutateAsync({
        amount: parseFloat(editForm.amount),
        note: editForm.note,
        date: editForm.date,
      })
    } finally {
      setEditSaving(false)
    }
  }

  const loading = statsQuery.isLoading || paymentsQuery.isLoading || expensesQuery.isLoading
  if (loading) return <LoadingSpinner text="Loading dashboard..." />
  if (statsQuery.isError) {
    return <Text style={styles.error}>Failed to load dashboard: {statsQuery.error.message}</Text>
  }

  const stats = statsQuery.data.data
  const payments = paymentsQuery.data.data
  const expenses = expensesQuery.data.data

  const onRefresh = async () => {
    setRefreshing(true)
    await Promise.all([
      statsQuery.refetch(),
      paymentsQuery.refetch(),
      expensesQuery.refetch(),
    ])
    setRefreshing(false)
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={(
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      )}
    >
      <Card style={styles.card}>
        <Card.Title title="Record Payday Income" titleVariant="titleMedium" />
        <Card.Content>
          <TextInput
            label="Amount (NGN)"
            value={incomeForm.amount}
            onChangeText={(v) => setIncomeForm({ ...incomeForm, amount: v })}
            mode="outlined"
            keyboardType="decimal-pad"
            style={styles.field}
          />
          <TextInput
            label="Note (optional)"
            value={incomeForm.note}
            onChangeText={(v) => setIncomeForm({ ...incomeForm, note: v })}
            mode="outlined"
            style={styles.field}
          />
          <TextInput
            label="Date"
            value={incomeForm.date}
            onChangeText={(v) => setIncomeForm({ ...incomeForm, date: v })}
            mode="outlined"
            style={styles.field}
            placeholder="YYYY-MM-DD"
          />
          <Button
            mode="contained"
            buttonColor={COLORS.accent}
            loading={incomeSaving}
            disabled={incomeSaving}
            onPress={handleAddIncome}
            icon="plus-circle"
          >
            Add Income
          </Button>
        </Card.Content>
      </Card>

      <View style={styles.statsRow}>
        <StatCard label="Total Received" value={fmtNaira(stats.income)} color="accent" />
        <StatCard label="Total Spent" value={fmtNaira(stats.expenses)} color="danger" />
      </View>
      <View style={styles.statsRow}>
        <StatCard label="Saved This Month" value={fmtNaira(stats.savings)} color="warning" />
        <StatCard label="Net Cash Flow" value={fmtNaira(stats.net)} color={stats.net >= 0 ? 'accent' : 'danger'} />
      </View>

      <Card style={[styles.card, styles.savingsCard]}>
        <Card.Title title="Savings Pot Balance" titleVariant="titleMedium" />
        <Card.Content>
          <Text style={styles.savingsBalance}>{fmtNaira(stats.savingsBalance)}</Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Recent Payments" titleVariant="titleMedium" />
        {payments.length === 0 ? (
          <Text style={styles.emptyText}>No payments yet</Text>
        ) : (
          payments.map((p, i) => (
            <View key={p.id}>
              {i > 0 && <Divider />}
              <List.Item
                title={p.customer_name || 'Manual'}
                description={`${fmtDateShort(p.received_at)} • ${methodLabel(p.method)}` + (p.note ? ` • ${p.note}` : '')}
                right={() => (
                  <View style={styles.rowRight}>
                    <Text style={styles.paymentAmount}>+{fmtNaira(p.amount_cents)}</Text>
                    <List.Icon icon="pencil" onPress={() => openEdit(p)} />
                    <List.Icon icon="delete" onPress={() => setDeleteTarget(p)} />
                  </View>
                )}
              />
            </View>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <Card.Title title="Recent Expenses" titleVariant="titleMedium" />
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>No expenses yet</Text>
        ) : (
          expenses.map((e, i) => (
            <View key={e.id}>
              {i > 0 && <Divider />}
              <List.Item
                title={e.category}
                description={`${fmtDateShort(e.spent_at)}` + (e.description ? ` • ${e.description}` : '')}
                right={() => (
                  <Text style={styles.expenseAmount}>-{fmtNaira(e.amount_cents)}</Text>
                )}
              />
            </View>
          ))
        )}
      </Card>

      <CrudModal
        visible={editModal}
        onDismiss={() => setEditModal(false)}
        onSave={handleSaveEdit}
        title="Edit Payment"
        saving={editSaving}
        form={editForm}
        setForm={setEditForm}
        fields={[
          { key: 'amount', label: 'Amount (NGN)', keyboardType: 'decimal-pad' },
          { key: 'note', label: 'Note' },
          { key: 'date', label: 'Date', keyboardType: 'default' },
        ]}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Payment"
        message={`Delete this payment of ${deleteTarget ? fmtNaira(deleteTarget.amount_cents) : ''}?`}
      />
    </ScrollView>
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
  field: {
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 8,
  },
  savingsCard: {
    backgroundColor: COLORS.primaryLight,
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 4,
  },
  savingsBalance: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
  },
  emptyText: {
    color: COLORS.muted,
    padding: 16,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentAmount: {
    color: COLORS.accent,
    fontWeight: '700',
    marginRight: 4,
  },
  expenseAmount: {
    color: COLORS.danger,
    fontWeight: '700',
    paddingRight: 8,
  },
  error: {
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: 40,
  },
})