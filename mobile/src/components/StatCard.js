import React from 'react'
import { View, StyleSheet } from 'react-native'
import { Card, Text } from 'react-native-paper'
import { COLORS } from '../utils/constants'

export default function StatCard({ label, value, color = 'primary' }) {
  const colorMap = {
    primary: COLORS.primary,
    accent: COLORS.accent,
    danger: COLORS.danger,
    warning: COLORS.warning,
  }
  const bgMap = {
    primary: COLORS.primaryLight,
    accent: '#F0FDF4',
    danger: '#FEF2F2',
    warning: '#FFFBEB',
  }

  const borderColor = colorMap[color] || COLORS.primary
  const bgColor = bgMap[color] || COLORS.primaryLight

  return (
    <Card style={[styles.card, { borderLeftColor: borderColor, backgroundColor: bgColor }]}>
      <Card.Content style={styles.content}>
        <Text variant="bodySmall" style={styles.label}>{label}</Text>
        <Text variant="titleLarge" style={[styles.value, { color: borderColor }]}>{value}</Text>
      </Card.Content>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 4,
    borderLeftWidth: 4,
    elevation: 1,
  },
  content: {
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  label: {
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  value: {
    fontWeight: '700',
    fontSize: 18,
  },
})
