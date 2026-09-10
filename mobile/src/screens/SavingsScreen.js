import React, { useState } from 'react'
import { View, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native'
import { Text, Card, List, Button, Snackbar, Portal, Dialog, TextInput } from 'react-native-paper'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../api/client'
import ConfirmDialog from '../components/ConfirmDialog'
import { LoadingSpinner } from '../components/EmptyState'
import { COLORS } from '../utils/constants'
import { fmtNaira, todayStr, fmtDateShort } from '../utils/format'

export default function SavingsScreen() {
  const queryClient = useQueryClient()
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [form, setForm] = useState({ amount: '', description: 'Deposit', date: todayStr() })
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [error, setError] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const entriesQuery = useQuery({ queryKey: ['savings'], queryFn: () => api.get('/api/savings') })
  const balanceQuery = useQuery({ queryKey: ['savings', 'balance'], queryFn: () => api.get('/api/savings/balance') })

  function invalidateAll() {
    queryClient.invalidateQueries(['savings'])
    queryClient.invalidateQueries(['dashboard'])
    queryClient.invalidateQueries(['reports'])
  }

  const depositMutation = useMutation({
    mutationFn: (payload) => api.post('/api/savings/deposit', payload),
    onSuccess: invalidateAll,
  })
  const withdrawMutation = useMutation({
    mutationFn: (payload) => api.post('/api/savings/withdraw', payload),
    onSuccess: invalidateAll,
  })
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/api/savings/${deleteTarget.id}`),
    onSuccess: () => {
      invalidateAll()
      setDeleteTarget(null)
    },
  })

  function openDeposit() {
    setForm({ amount: '', description: 'Deposit', date: todayStr() })
    setShowDeposit(true)
  }

  function openWithdraw() {
    setForm({ amount: '', description: 'Withdrawal', date: todayStr() })
    setShowWithdraw(true)
  }

  async function handleSave(kind) {
    if (!form.amount) {
      setError('Amount is required')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        amount: parseFloat(form.amount),
        description: form.description,
        date: form.date,
      }
      if (kind === 'deposit') {
        await depositMutation.mutateAsync(payload)
        setShowDeposit(false)
      } else {
        await withdrawMutation.mutateAsync(payload)
        setShowWithdraw(false)
      }
    } catch (err) {
      setError(err.message || 'Failed')
    } finally {
      setSaving(false)
    }
  }

  if (entriesQuery.isLoading || balanceQuery.isLoading) {
    return <LoadingSpinner text="Loading savings..." />
  }

  const entries = entriesQuery.data.data
  const balance = balanceQuery.data.balance

  return (
    <View style={styles.flex}>
      <FlatList
        data={entries}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Card style={[styles.card, styles.balanceCard]}>
              <Card.Title title="Current Savings Balance" titleVariant="titleMedium" titleStyle={{ color: COLORS.textSecondary }} />
              <Card.Content>
                <Text style={styles.balance}>{fmtNaira(balance)}</Text>
              </Card.Content>
            </Card>
            <View style={styles.buttonRow}>
              <Button
                mode="contained"
                buttonColor={COLORS.accent}
                icon="plus-circle"
                style={styles.actionButton}
                onPress={openDeposit}
              >
                Add to Savings
              </Button>
              <Button
                mode="contained"
                buttonColor={COLORS.danger}
                icon="minus-circle"
                style={styles.actionButton}
                onPress={openWithdraw}
              >
                Withdraw
              </Button>
            </View>
            <Text style={styles.sectionTitle}>Savings History</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await Promise.all([entriesQuery.refetch(), balanceQuery.refetch()])
              setRefreshing(false)
            }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No savings activity yet.</Text>}
        renderItem={({ item }) => {
          const isDeposit = item.amount_cents > 0
          return (
            <Card style={styles.card}>
              <Card.Title
                title={item.description || (isDeposit ? 'Deposit' : 'Withdrawal')}
                subtitle={fmtDateShort(item.saved_at)}
                left={(p) => (
                  <List.Icon {...p} icon={isDeposit ? 'plus' : 'minus'} color={isDeposit ? COLORS.accent : COLORS.danger} />
                )}
              />
              <Card.Content>
                <View style={styles.cardActions}>
                  <Text style={[styles.amount, isDeposit ? styles.deposit : styles.withdraw]}>
                    {isDeposit ? '+' : '-'}{fmtNaira(Math.abs(item.amount_cents))}
                  </Text>
                  <Button compact icon="delete" textColor={COLORS.danger} onPress={() => setDeleteTarget(item)}>
                    Delete
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )
        }}
      />

      <SavingsModal
        visible={showDeposit}
        onDismiss={() => setShowDeposit(false)}
        onSave={() => handleSave('deposit')}
        title="Add to Savings Pot"
        saving={saving}
        form={form}
        setForm={setForm}
        buttonColor={COLORS.accent}
        buttonText="Add to Pot"
      />

      <SavingsModal
        visible={showWithdraw}
        onDismiss={() => setShowWithdraw(false)}
        onSave={() => handleSave('withdraw')}
        title="Withdraw from Savings"
        saving={saving}
        form={form}
        setForm={setForm}
        buttonColor={COLORS.danger}
        buttonText="Withdraw"
        warnMessage={`Current balance: ${fmtNaira(balance)}`}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate()}
        title="Delete Savings Entry"
        message="Delete this savings entry? This only removes the history record."
      />
      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>
    </View>
  )
}

function SavingsModal({ visible, onDismiss, onSave, title, saving, form, setForm, buttonColor, buttonText, warnMessage }) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          {warnMessage ? <Text style={styles.warn}>{warnMessage}</Text> : null}
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
            style={styles.input}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button mode="contained" buttonColor={buttonColor} loading={saving} disabled={saving} onPress={onSave}>
            {buttonText}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  listContent: { padding: 16, paddingBottom: 32 },
  card: {
    marginBottom: 10,
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  balanceCard: {
    backgroundColor: COLORS.primaryLight,
    borderLeftColor: COLORS.primary,
    borderLeftWidth: 4,
  },
  balance: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.primary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 8,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amount: {
    fontWeight: '700',
  },
  deposit: {
    color: COLORS.accent,
  },
  withdraw: {
    color: COLORS.danger,
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 24,
  },
  warn: {
    color: COLORS.warning,
    marginBottom: 12,
  },
  input: {
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
})