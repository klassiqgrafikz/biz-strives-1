import React, { useState } from 'react'
import { View, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native'
import { Text, Card, Button, TextInput, Chip, Snackbar, Banner, ActivityIndicator } from 'react-native-paper'
import * as ImagePicker from 'expo-image-picker'
import { useQuery, useMutation } from '@tanstack/react-query'
import { api } from '../api/client'
import { LoadingSpinner } from '../components/EmptyState'
import { COLORS } from '../utils/constants'

export default function NotificationsScreen() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [image, setImage] = useState(null)
  const [imagePlacement, setImagePlacement] = useState('header')
  const [selected, setSelected] = useState({})
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const recipientsQuery = useQuery({
    queryKey: ['notifications', 'recipients'],
    queryFn: () => api.get('/api/notifications/recipients'),
  })

  const sendMutation = useMutation({
    mutationFn: (payload) => api.post('/api/notifications/broadcast', payload),
  })

  const recipients = recipientsQuery.isSuccess ? recipientsQuery.data.data : []
  const selectedCount = Object.values(selected).filter(Boolean).length
  const selectAll = selectedCount === recipients.length && recipients.length > 0

  function toggleAll() {
    if (selectAll) {
      setSelected({})
    } else {
      const map = {}
      recipients.forEach((r) => {
        map[r.id] = true
      })
      setSelected(map)
    }
  }

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Permission to access photos is required')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    })
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0])
    }
  }

  async function handleSend() {
    if (!subject) {
      setError('Subject is required')
      return
    }
    if (!body) {
      setError('Message body is required')
      return
    }
    if (selectedCount === 0) {
      setError('Select at least one recipient')
      return
    }

    setSending(true)
    setError('')
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('subject', subject)
      fd.append('html', escapeHtml(body).split('\n').map((p) => `<p>${p}</p>`).join(''))
      fd.append('recipientIds', JSON.stringify(Object.entries(selected).filter(([, v]) => v).map(([k]) => k)))
      fd.append('imagePlacement', imagePlacement)
      if (image) {
        const ext = getExt(image.uri)
        fd.append('image', {
          uri: image.uri,
          name: `image.${ext}`,
          type: image.mimeType || 'image/jpeg',
        })
      }
      const res = await sendMutation.mutateAsync(fd)
      setResult(res.results || res)
    } catch (err) {
      setError(err.message || 'Send failed')
    } finally {
      setSending(false)
    }
  }

  if (recipientsQuery.isLoading) return <LoadingSpinner text="Loading recipients..." />

  return (
    <Layout
      subject={subject}
      setSubject={setSubject}
      body={body}
      setBody={setBody}
      image={image}
      setImage={setImage}
      pickImage={pickImage}
      imagePlacement={imagePlacement}
      setImagePlacement={setImagePlacement}
      recipients={recipients}
      selected={selected}
      setSelected={setSelected}
      selectedCount={selectedCount}
      selectAll={selectAll}
      toggleAll={toggleAll}
      sending={sending}
      handleSend={handleSend}
      result={result}
      error={error}
      setError={setError}
    />
  )
}

function Layout(props) {
  const {
    subject, setSubject, body, setBody, image, setImage, pickImage,
    imagePlacement, setImagePlacement, recipients, selected, setSelected,
    selectedCount, selectAll, toggleAll, sending, handleSend,
    result, error, setError,
  } = props

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <Card style={styles.card}>
          <Card.Title title="Compose Message" titleVariant="titleMedium" />
          <Card.Content>
            <TextInput
              label="Subject"
              value={subject}
              onChangeText={setSubject}
              mode="outlined"
              style={styles.input}
            />

            <View style={styles.imageRow}>
              <Button icon="image" mode="outlined" onPress={pickImage} style={styles.imageBtn}>
                {image ? 'Change Image' : 'Choose Image'}
              </Button>
              <Text style={styles.imageHint}>JPEG/PNG/WebP, max 3MB</Text>
            </View>

            {image && (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="contain" />
                <TouchableOpacity onPress={() => setImage(null)} style={styles.removeImage}>
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.fieldLabel}>Image Placement</Text>
            <View style={styles.chipRow}>
              <Chip selected={imagePlacement === 'header'} onPress={() => setImagePlacement('header')} style={styles.chip}>
                Header Banner
              </Chip>
              <Chip selected={imagePlacement === 'body'} onPress={() => setImagePlacement('body')} style={styles.chip}>
                Inside Body
              </Chip>
            </View>

            <TextInput
              label="Message"
              value={body}
              onChangeText={setBody}
              mode="outlined"
              multiline
              numberOfLines={10}
              style={[styles.input, styles.bodyInput]}
              placeholder="Write your message here..."
            />
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Title
            title={`Recipients (${selectedCount})`}
            titleVariant="titleMedium"
            right={() => (
              <Button compact onPress={toggleAll}>
                {selectAll ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          />
          <Card.Content>
            {recipients.length === 0 ? (
              <Text style={styles.empty}>No customers with email addresses.</Text>
            ) : (
              <View style={styles.recipientWrap}>
                {recipients.map((r) => {
                  const active = !!selected[r.id]
                  return (
                    <Chip
                      key={r.id}
                      selected={active}
                      onPress={() => setSelected({ ...selected, [r.id]: !active })}
                      style={styles.recipientChip}
                    >
                      {r.name} ({r.email})
                    </Chip>
                  )
                })}
              </View>
            )}
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          buttonColor={COLORS.primary}
          icon="send"
          loading={sending}
          disabled={sending}
          onPress={handleSend}
          style={styles.sendBtn}
        >
          {sending ? 'Sending...' : `Send to ${selectedCount} Customer${selectedCount === 1 ? '' : 's'}`}
        </Button>

        {result && (
          <Banner visible icon="check-circle" actions={[]} style={styles.resultBanner}>
            <Text>
              Sent: {result.sent} • Failed: {result.failed}
            </Text>
          </Banner>
        )}
      </ScrollView>

      <Snackbar visible={!!error} onDismiss={() => setError('')} duration={4000}>
        {error}
      </Snackbar>
    </View>
  )
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getExt(uri) {
  const m = /\.(\w+)$/.exec(uri || '')
  return m ? m[1] : 'jpg'
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  card: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    elevation: 1,
  },
  input: {
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  bodyInput: {
    minHeight: 160,
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  imageBtn: {
    flex: 1,
    marginRight: 8,
  },
  imageHint: {
    color: COLORS.muted,
    fontSize: 12,
  },
  imagePreviewWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  imagePreview: {
    width: '100%',
    height: 140,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  removeImage: {
    marginTop: 4,
  },
  removeImageText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldLabel: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  chip: {
    marginRight: 8,
  },
  empty: {
    color: COLORS.muted,
    textAlign: 'center',
    paddingVertical: 16,
  },
  recipientWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  recipientChip: {
    marginBottom: 6,
    marginRight: 6,
  },
  sendBtn: {
    marginTop: 4,
    borderRadius: 8,
  },
  resultBanner: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
  },
})