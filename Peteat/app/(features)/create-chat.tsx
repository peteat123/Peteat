import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  Pressable,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from '../../hooks/useColorScheme';
import { Colors } from '../../constants/Colors';
import { Typography } from '@/constants/Typography';
import { userAPI } from '../api/api';
import { messageAPI } from '../api/api';
import { useRouter } from 'expo-router';

interface ClinicItem {
  id: string;
  fullName: string; // stored as clinicName or fullName in DB
  clinicName?: string;
  profilePicture?: string;
  location?: any;
  operatingHours?: string;
}

export default function CreateChatScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const [clinics, setClinics] = useState<ClinicItem[]>([]);
  const [selectedClinic, setSelectedClinic] = useState<ClinicItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchClinics = async () => {
      try {
        const data = await userAPI.getApprovedClinics();
        setClinics(data);
      } catch (err) {
        console.error('Failed to fetch clinics', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchClinics();
  }, []);

  const renderItem = ({ item }: { item: ClinicItem }) => (
    <TouchableOpacity
      style={[styles.card, { borderColor: colors.border, backgroundColor: colors.cardBackground }]}
      activeOpacity={0.8}
      onPress={() => setSelectedClinic(item)}
    >
      <Image
        source={item.profilePicture ? { uri: item.profilePicture } : require('../../assets/images/peteat-logo.png')}
        style={styles.avatar}
      />
      <Text style={[Typography.nunitoBodyBold, { flex: 1, color: colors.text }]}> 
        {item.clinicName || item.fullName}
      </Text>
      <TouchableOpacity
        onPress={() => handleStartChat(item)}
        style={styles.chatBtn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Image source={require('../../assets/images/chatting.png')} style={styles.chatIcon} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const handleStartChat = async (clinic: ClinicItem) => {
    try {
      // Send an initial greeting message to create conversation
      await messageAPI.sendMessage(clinic.id, 'Hello!');
    } catch (err) {
      console.log('Could not create conversation', err);
    }
    router.push(`/chat/${clinic.id}` as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 18 }}>←</Text>
        </TouchableOpacity>
        <Text style={[Typography.nunitoSubheading, { color: colors.text }]}>Select Clinic</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={clinics}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Modal for clinic details */}
      <Modal
        visible={!!selectedClinic}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedClinic(null)}
      >
        <TouchableWithoutFeedback onPress={() => setSelectedClinic(null)}>
          <View style={styles.modalOverlay}>
            <Pressable onPress={() => {}} style={[styles.modalContent, { backgroundColor: colors.cardBackground }]}>
              {selectedClinic && (
                <>
                  <Image
                    source={selectedClinic.profilePicture ? { uri: selectedClinic.profilePicture } : require('../../assets/images/peteat-logo.png')}
                    style={styles.modalImage}
                  />
                  <Text style={[Typography.nunitoSubheading, { marginTop: 12, color: colors.text }]}> 
                    {selectedClinic.clinicName || selectedClinic.fullName}
                  </Text>
                  {selectedClinic.location && (
                    <Text style={[Typography.nunitoBody, { marginTop: 8, color: colors.text }]}>📍 {typeof selectedClinic.location === 'string' ? selectedClinic.location : `${selectedClinic.location.coordinates?.[1]?.toFixed(5)}, ${selectedClinic.location.coordinates?.[0]?.toFixed(5)}`}</Text>
                  )}
                  {selectedClinic.operatingHours && (
                    <Text style={[Typography.nunitoBody, { marginTop: 4, color: colors.text }]}>🕒 {selectedClinic.operatingHours}</Text>
                  )}
                </>
              )}
            </Pressable>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { marginRight: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  chatBtn: { paddingHorizontal: 4 },
  chatIcon: { width: 24, height: 24, resizeMode: 'contain' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  modalImage: { width: 100, height: 100, borderRadius: 50 },
}); 