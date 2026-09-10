import React, { useState } from 'react'
import { View, StyleSheet, ScrollView } from 'react-native'
import { Text, Card, Button, List, Divider, ActivityIndicator, Snackbar } from 'react-native-paper'
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'
import StatCard from '../components/StatCard'
import { LoadingSpinner } from '../components/EmptyState'
import { COLORS } from '../utils/constants'
import { fmtNaira, fmtDateShort } from '../utils/format'
import { downloadStatementPdf } from '../utils/pdf'

function monthsSince2020() {
  const out = []
  const now = new Date()
  for (let y = now.getFullYear(); y >= 2020; y--) {
    const maxM = y === now.getFullYear() ? now.getMonth() : 11
    for (let m = maxM; m >= 0; m--) {
      out.push(`${y}-${String(m + 1).padStart(2, '0')}`)
    }
  }
  return out
}

const now = new Date()
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

export default function ReportsScreen() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  const query = useQuery({
    queryKey: ['reports', selectedMonth],
    queryFn: () => api.get(`/api/reports?month=${selectedMonth}`),
  })

  async function handleDownload() {
    setDownloading(true)
    setError('')
    try {
      await downloadStatementPdf(selectedMonth, `statement-${selectedMonth}.pdf`)
    } catch (err) {
      setError(err.message || 'Failed to download PDF')
    } finally {
      setDownloading(false)
    }
  }

  if (query.isLoading) return <LoadingSpinner text="Loading report..." />
  if (query.isError) return <Text style={styles.error}>Failed to load report: {query.error.message}</Text>

  const data = query.data.data

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return `${months[m - 1]} ${y}`
  })()

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.monthTitle}>{monthLabel}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthBar}>
        {monthsSince2020().slice(0, 24).map((m) => {
          const [y, mm] = m.split('-').map(Number)
          const label = (['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][mm - 1] + ` ${String(y).slice(2)}`)
          const active = m === selectedMonth
          return (
            <Button
              key={m}
              mode={active ? 'contained' : 'outlined'}
              compact
              buttonColor={active ? COLORS.primary : undefined}
              textColor={active ? '#fff' : COLORS.textSecondary}
              style={styles.monthChip}
              onPress={() => setSelectedMonth(m)}
            >
              {label}
            </Button>
          )
        })}
      </ScrollView>

      <Card style={styles.card}>
        <Card.Title title="Income Received" titleVariant="titleMedium" />
        <Card.Content>
          <Text style={styles.incomeTotal}>{fmtNaira(data.incomeTotal)}</Text>
          {data.payments.slice(0, 10).map((p) => (
            <View key={p.id}>
              <List.Item
                title={p.customer_name || 'Manual'}
                description={fmtDateShort(p.received_at)}
                right={() => <Text style={styles.incomeRow}>+{fmtNaira(p.amount_cents)}</Text>}
              />
              <Divider />
            </View>
          ))}
          {data.payments.length > 10 && (
            <Text style={styles.more}>+{data.payments.length - 10} more transactions</Text>
          )}
        </Card.Content>
      </Card>

      <View style={styles.statsRow}>
        <StatCard label="Total Expenses" value={fmtNaira(data.expenseTotal)} color="danger" />
        <StatCard label="Total Savings" value={fmtNaira(data.savingsTotal)} color="warning" />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          label="Net Cash Flow"
          value={fmtNaira(data.net)}
          color={data.net >= 0 ? 'accent' : 'danger'}
        />
      </View>

      {data.expenses.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Expenses Detail" titleVariant="titleMedium" />
          <Card.Content>
            {data.expenses.map((e) => (
              <View key={e.id}>
                <List.Item
                  title={e.category}
                  description={`${fmtDateShort(e.spent_at)}${e.description ? ` • ${e.description}` : ''}`}
                  right={() => <Text style={styles.expenseRow}>-{fmtNaira(e.amount_cents)}</Text>}
                />
                <Divider />
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {data.savings.length > 0 && (
        <Card style={styles.card}>
          <Card.Title title="Savings Detail" titleVariant="titleMedium" />
          <Card.Content>
            {data.savings.map((s) => {
              const positive = s.amount_cents > 0
              return (
                <View key={s.id}>
                  <List.Item
                    title={s.description || 'Savings'}
                    description={fmtDateShort(s.saved_at)}
                    right={() => (
                      <Text style={positive ? styles.incomeRow : styles.expenseRow}>
                        {positive ? '+' : '-'}{fmtNaira(Math.abs(s.amount_cents))}
                      </Text>
                    )}
                  />
                  <Divider />
                </View>
              )
            })}
          </Card.Content>
        </Card>
      )}

      <Button
        mode="contained"
        buttonColor={COLORS.primary}
        icon="download"
        loading={downloading}
        disabled={downloading}
        onPress={handleDownload}
        style={styles.downloadBtn}
      >
        Download PDF Statement
      </Button>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  monthTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 12,
  },
  monthBar: {
    marginBottom: 16,
  },
  monthChip: {
    marginRight: 8,
    borderRadius: 20,
  },
  card: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  incomeTotal: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.accent,
    marginBottom: 8,
  },
  incomeRow: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  expenseRow: {
    color: COLORS.danger,
    fontWeight: '700',
  },
  more: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 8,
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 8,
  },
  downloadBtn: {
    marginTop: 8,
    borderRadius: 8,
  },
  error: {
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: 40,
  },
})