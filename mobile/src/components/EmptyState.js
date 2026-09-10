import React from 'react'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { Text } from 'react-native-paper'
import { COLORS } from '../utils/constants'

export default function EmptyState({ icon, message = 'No records found' }) {
  return (
    <View style={styles.container}>
      <Text variant="bodyLarge" style={styles.text}>{message}</Text>
    </View>
  )
}

export function LoadingSpinner({ text }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {text && <Text variant="bodyMedium" style={styles.loadingText}>{text}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  text: {
    color: COLORS.muted,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
  },
})
