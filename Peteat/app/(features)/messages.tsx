import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
  // Alert
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography } from '@/constants/Typography';
import { LoadingDialog } from '../../components/ui/LoadingDialog';
import { messageAPI } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { addSocketListener, removeSocketListener, getSocket } from '../../utils/socket';

interface ConversationItem {
  conversationId: string;
  userId: string;
  partnerName?: string;
  partnerPicture?: string; // URL
  lastMessage: string;
  timestamp: string | Date;
  unread: number;
  partnerType?: string;
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Fetch inbox on mount / on focus
  useEffect(() => {
    fetchConversations();
    
    // Set up socket connection for real-time updates
    setupSocketConnection();
    
    // Clean up function to remove listeners
    return () => {
      removeSocketListener('conversationUpdated');
    };
  }, []);
  
  const fetchConversations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await messageAPI.getUserConversations();
      setConversations(data);
      setPage(1);
    } catch (err) {
      console.error('Error loading conversations', err);
      setError('Failed to load conversations. Pull down to refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketConnection = async () => {
    try {
      // Use the getSocket function to get a socket instance
      await getSocket();
      
      // Add listener for conversation updates
      addSocketListener('conversationUpdated', (summary: any) => {
        setConversations((prev) => {
          const idx = prev.findIndex((c) => c.userId === summary.userId);
          if (idx >= 0) {
            const updated = { ...prev[idx], ...summary };
            const list = [...prev];
            list[idx] = updated;
            return list;
          }
          return [summary, ...prev];
        });
      });
    } catch (e) {
      console.error('Socket connection failed:', e);
      // Don't show an alert here - just log the error
      // Real-time updates won't work but the user can still see existing conversations
    }
  };
  
  const goBack = () => {
    router.back();
  };
  
  const handleNewMessage = () => {
    router.push('/create-chat' as any);
  };
  
  const openConversation = (partnerId: string, name: string) => {
    router.push(`/chat/${partnerId}` as any);
  };

  const handleRefresh = () => {
    fetchConversations();
  };
  
  // Search conversations
  const filteredConversationsAll = conversations.filter(conv => {
    if (!searchQuery) return true;
    
    const name = conv.partnerName?.toLowerCase() || '';
    const message = conv.lastMessage?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return name.includes(query) || message.includes(query);
  });
  
  // Paginate client-side for now
  const filteredConversations = filteredConversationsAll.slice(0, page * PAGE_SIZE);
  
  // Render message list item
  const renderMessageItem = ({ item }: { item: ConversationItem }) => {
    const name = item.partnerName || 'Unknown';
    
    return (
      <TouchableOpacity 
        style={[styles.conversationItem, { borderBottomColor: colors.border }]} 
        onPress={() => openConversation(item.userId, name)}
        activeOpacity={0.7}
      >
        {item.partnerPicture ? (
          <Image source={{ uri: item.partnerPicture }} style={styles.conversationImage} />
        ) : (
          <Image source={require('../../assets/images/robert-pisot.jpg')} style={styles.conversationImage} />
        )}
        
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={[Typography.nunitoBodyBold, { color: colors.text }]}>
              {name}
            </Text>
            <Text style={[Typography.nunitoCaption, { color: colors.icon }]}>
              {typeof item.timestamp === 'string' ? item.timestamp : new Date(item.timestamp).toLocaleString()}
            </Text>
          </View>
          
          <View style={styles.conversationContent}>
            <Text style={[Typography.nunitoBodyMedium, { color: (colors as any).babyBlue, marginRight: 4 }]}>
              {/* Optional: show petName / partnerType etc. */}
            </Text>
            <Text 
              style={[
                Typography.nunitoBody,
                { color: item.unread > 0 ? colors.text : colors.icon, flex: 1 },
                item.unread > 0 && Typography.nunitoBodyMedium
              ]} 
              numberOfLines={1}
            >
              {item.lastMessage}
            </Text>
            
            {item.unread > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: (colors as any).babyBlue }]}>
                <Text style={[Typography.nunitoCaption, { color: '#fff', fontWeight: '600' }]}>
                  {item.unread}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Image 
            source={require('../../assets/images/left-arrow.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <Text style={[Typography.nunitoSubheading, { color: colors.text }]}>Messages</Text>
      </View>
      
      {/* Search Bar */}
      <View style={[styles.searchContainer, { borderBottomColor: colors.border }]}>
        <View style={[styles.searchWrapper, { backgroundColor: colorScheme === 'dark' ? colors.cardBackground : '#F5F5F8' }]}>
          <IconSymbol name="magnifyingglass" size={20} color={colors.icon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search messages"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.icon}
          />
        </View>
        <TouchableOpacity 
          style={styles.composeButton} 
          onPress={handleNewMessage}
          activeOpacity={0.7}
        >
          <IconSymbol name="square.and.pencil" size={24} color={(colors as any).babyBlue} />
        </TouchableOpacity>
      </View>
      
      {/* Error message if unable to load conversations */}
      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <IconSymbol name="exclamationmark.triangle" size={24} color="orange" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Message List */}
      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.conversationId}
        renderItem={renderMessageItem as any}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={handleRefresh}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (filteredConversations.length < filteredConversationsAll.length) {
            setPage(prev => prev + 1);
          }
        }}
        ListEmptyComponent={() => (
          !isLoading && (
            <View style={styles.emptyContainer}>
              <IconSymbol name="bubble.left.and.bubble.right" size={40} color={colors.icon} />
              <Text style={[Typography.nunitoBody, { color: colors.text, textAlign: 'center', marginTop: 8 }]}>
                {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity style={styles.startChatButton} onPress={handleNewMessage}>
                  <Text style={styles.startChatText}>Start a new conversation</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        )}
      />
      
      {/* Loading indicator */}
      <LoadingDialog visible={isLoading && conversations.length === 0} message="Loading..." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    paddingLeft: 8,
  },
  composeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  listContent: {
    paddingVertical: 8,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  conversationImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 204, 0, 0.1)',
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    marginTop: 8,
    textAlign: 'center',
    color: '#333',
  },
  retryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  startChatButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  startChatText: {
    color: '#fff',
    fontWeight: '600',
  },
});