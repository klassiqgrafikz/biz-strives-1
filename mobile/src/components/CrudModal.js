import React from 'react'
import { Portal, Dialog, TextInput, Button, ScrollView, StyleSheet } from 'react-native-paper'
import { COLORS } from '../utils/constants'

export default function CrudModal({ visible, onDismiss, onSave, title, fields, form, setForm, saving }) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.ScrollArea style={styles.scrollArea}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {fields.map((f) => (
              <TextInput
                key={f.key}
                label={f.label}
                value={String(form[f.key] || '')}
                onChangeText={(v) => setForm({ ...form, [f.key]: v })}
                mode="outlined"
                style={styles.input}
                keyboardType={f.keyboardType || 'default'}
                secureTextEntry={f.secure || false}
                multiline={f.multiline || false}
                numberOfLines={f.numberOfLines || 1}
                right={
                  f.right ? (
                    <TextInput.Icon icon={f.right.icon} onPress={f.right.onPress} />
                  ) : undefined
                }
              />
            ))}
          </ScrollView>
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
  dialog: {
    maxHeight: '80%',
  },
  scrollArea: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
})
