import React from 'react'
import { Dialog, Portal, Button, Text } from 'react-native-paper'
import { COLORS } from '../utils/constants'

export default function ConfirmDialog({ visible, onDismiss, onConfirm, title, message }) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title || 'Confirm'}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message || 'Are you sure?'}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button textColor={COLORS.danger} onPress={onConfirm}>Delete</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  )
}
