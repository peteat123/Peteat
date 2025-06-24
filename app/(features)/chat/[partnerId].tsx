import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../../hooks/useColorScheme';
import { Colors } from '../../../constants/Colors';
import { Typography } from '../../../constants/Typography';
import { messageAPI } from '../../api/api';
import { useAuth } from '../../contexts/AuthContext';
import { getSocket } from '../../../utils/socket';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '../../api/api';

interface MessageItem {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
  attachments?: string[];
}

export default function ChatScreen() {
  const { partnerId } = useLocalSearchParams<{ partnerId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Load initial conversation
    const load = async () => {
      try {
        const data = await messageAPI.getConversation(partnerId as string);
        setMessages(data);
      } catch (err) {
        console.error('Failed to load conversation', err);
      }
    };
    load();
  }, [partnerId]);

  useEffect(() => {
    let socket: any;
    (async () => {
      try {
        socket = await getSocket();
        // Scroll to bottom when connected
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 200);

        socket.on('receiveMessage', (msg: MessageItem) => {
          // Only push if message belongs to this conversation
          if (
            (msg.sender === partnerId && msg.receiver === user?.id) ||
            (msg.sender === user?.id && msg.receiver === partnerId)
          ) {
            setMessages((prev) => [...prev, msg]);
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        });
      } catch (err) {
        console.error('Socket connect error', err);
      }
    })();

    return () => {
      socket?.off('receiveMessage');
    };
  }, [partnerId, user?.id]);

  const sendMessage = async () => {
    if (!input.trim()) return;
    try {
      const socket = await getSocket();
      socket.emit('sendMessage', {
        receiver: partnerId,
        content: input.trim(),
      });
      // Optimistic UI update
      setMessages((prev) => [...prev, {
        _id: Date.now().toString(),
        sender: user!.id,
        receiver: partnerId as string,
        content: input.trim(),
        timestamp: new Date().toISOString(),
      }]);
      setInput('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (err) {
      console.error('Failed to send message', err);
    }
  };

  const pickImageFromLibrary = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!res.canceled) {
      await handleFileUpload(res.assets[0].uri, 'image');
    }
  };

  const pickDocument = async () => {
    const res: any = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] });
    if (!res.canceled && res.assets?.[0]?.uri) {
      await handleFileUpload(res.assets[0].uri, 'document');
    } else if (res.uri) {
      await handleFileUpload(res.uri, 'document');
    }
  };

  const handleFileUpload = async (uri: string, kind: 'image' | 'document') => {
    try {
      setUploading(true);
      const fileInfo = await FileSystem.getInfoAsync(uri);
      const formData = new FormData();
      formData.append('file', {
        uri,
        name: uri.split('/').pop() || `upload.${kind === 'image' ? 'jpg' : 'pdf'}`,
        type: kind === 'image' ? 'image/jpeg' : 'application/pdf',
      } as any);

      const response = await fetch(`${API_BASE_URL.replace(/\/api$/, '')}/uploads/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      const data = await response.json();
      if (data.url) {
        await sendMessageWithAttachment(data.url);
      }
    } catch (e) {
      console.error('Upload error', e);
    } finally {
      setUploading(false);
    }
  };

  const sendMessageWithAttachment = async (url: string) => {
    try {
      const socket = await getSocket();
      socket.emit('sendMessage', { receiver: partnerId, content: '', attachments: [url] });
    } catch (err) {
      console.error('Failed to send attachment', err);
    }
  };

  const renderItem = ({ item }: { item: MessageItem }) => {
    const isMine = item.sender === user?.id;
    const hasImage = item.attachments && item.attachments[0] && item.attachments[0].match(/\.(png|jpe?g|gif)$/i);
    return (
      <View
        style={[
          styles.messageBubble,
          {
            alignSelf: isMine ? 'flex-end' : 'flex-start',
            backgroundColor: isMine ? (colors as any).babyBlue : colors.cardBackground,
          },
        ]}
      >
        {item.content ? (
          <Text style={[Typography.nunitoBody, { color: isMine ? '#fff' : colors.text }]}>{item.content}</Text>
        ) : null}
        {hasImage && (
          <Image source={{ uri: item.attachments![0] }} style={{ width: 160, height: 160, borderRadius: 8, marginTop: 4 }} />
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[Typography.nunitoSubheading, { color: colors.text }]}>Chat</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={{ padding: 16 }}
      />

      {/* Input */}
      <View style={[styles.inputBar, { borderTopColor: colors.border }]}>
        <TouchableOpacity onPress={pickImageFromLibrary} style={styles.attachBtn}>
          <Text style={{ fontSize: 20 }}>📎</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={pickDocument} style={styles.attachBtn}>
          <Text style={{ fontSize: 20 }}>📄</Text>
        </TouchableOpacity>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor={colors.icon}
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
          <Text style={{ color: (colors as any).babyBlue, fontWeight: '600' }}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    marginRight: 12,
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f1f1f3',
    marginRight: 8,
  },
  sendBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attachBtn: {
    padding: 8,
  },
}); 