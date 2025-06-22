import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';

// Mock data for demo
const MOCK_PETS = [
  { 
    id: '1',
    name: 'Max',
    breed: 'Golden Retriever',
    status: 'Under Observation',
    statusColor: '#FFA726',
    lastUpdate: '2 hours ago',
    clinicName: 'PawCare Clinic',
    notes: 'Post-surgery recovery. Monitoring vital signs.',
    image: require('../../assets/images/robert-pisot.jpg'),
  },
  { 
    id: '2',
    name: 'Bella',
    breed: 'Siamese Cat',
    status: 'In Treatment',
    statusColor: '#29B6F6',
    lastUpdate: 'Yesterday',
    clinicName: 'Animal Wellness Hub',
    notes: 'Taking antibiotics for infection. Showing improvement.',
    image: require('../../assets/images/robert-pisot.jpg'),
  },
  { 
    id: '3',
    name: 'Charlie',
    breed: 'Beagle',
    status: 'Recovered',
    statusColor: '#66BB6A',
    lastUpdate: '3 days ago',
    clinicName: 'Pet Wellness Center',
    notes: 'Fully recovered from surgery. Ready for discharge.',
    image: require('../../assets/images/robert-pisot.jpg'),
  },
];

export default function PetStatusScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Mock user and role for demo
  const [userRole, setUserRole] = useState<'user' | 'clinic'>('user');
  
  const goBack = () => {
    router.back();
  };
  
  const toggleRole = () => {
    setUserRole(prev => prev === 'user' ? 'clinic' : 'user');
  };
  
  const viewDetails = (petId: string) => {
    Alert.alert('View Details', `Viewing details for pet ID: ${petId}`);
  };
  
  const updateStatus = (petId: string) => {
    Alert.alert('Update Status', 'Status update functionality will be implemented soon.');
  };
  
  const messageClinic = (clinicName: string) => {
    Alert.alert('Message Clinic', `Messaging ${clinicName} functionality will be available soon.`);
  };
  
  // Render pet item
  const renderPetItem = ({ item }: { item: typeof MOCK_PETS[0] }) => (
    <View style={styles.petCard}>
      <View style={styles.petHeader}>
        <Image source={item.image} style={styles.petImage} />
        
        <View style={styles.petInfo}>
          <Text style={styles.petName}>{item.name}</Text>
          <Text style={styles.petBreed}>{item.breed}</Text>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: item.statusColor + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: item.statusColor }]} />
          <Text style={[styles.statusText, { color: item.statusColor }]}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.petContent}>
        <View style={styles.detailRow}>
          <IconSymbol name="clock.fill" size={16} color={Colors.light.icon} />
          <Text style={styles.detailText}>Last updated: {item.lastUpdate}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <IconSymbol name="building.2.fill" size={16} color={Colors.light.icon} />
          <Text style={styles.detailText}>Clinic: {item.clinicName}</Text>
        </View>
        
        <View style={styles.notesSection}>
          <Text style={styles.notesLabel}>Clinic Notes:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => viewDetails(item.id)}
        >
          <IconSymbol name="doc.text.fill" size={20} color={Colors.light.tint} />
          <Text style={styles.actionButtonText}>View Details</Text>
        </TouchableOpacity>
        
        {userRole === 'clinic' ? (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => updateStatus(item.id)}
          >
            <IconSymbol name="arrow.triangle.2.circlepath" size={20} color={Colors.light.tint} />
            <Text style={styles.actionButtonText}>Update Status</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => messageClinic(item.clinicName)}
          >
            <IconSymbol name="message.fill" size={20} color={Colors.light.tint} />
            <Text style={styles.actionButtonText}>Message Clinic</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Image 
            source={require('../../assets/images/left-arrow.png')}
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>
          {userRole === 'user' ? 'My Pets Status' : 'Pets Under Care'}
        </Text>
        
        {/* Demo only - Toggle between user and clinic view */}
        <TouchableOpacity style={styles.roleToggle} onPress={toggleRole}>
          <Text style={styles.roleText}>{userRole === 'user' ? '👤' : '🏥'}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Status Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Status Legend:</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#FFA726' }]} />
            <Text style={styles.legendText}>Under Observation</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#29B6F6' }]} />
            <Text style={styles.legendText}>In Treatment</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#66BB6A' }]} />
            <Text style={styles.legendText}>Recovered</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#EF5350' }]} />
            <Text style={styles.legendText}>Critical</Text>
          </View>
          
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#AB47BC' }]} />
            <Text style={styles.legendText}>Post-Op</Text>
          </View>
        </ScrollView>
      </View>
      
      {/* Pet List */}
      <FlatList
        data={MOCK_PETS}
        renderItem={renderPetItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    tintColor: Colors.light.text,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  roleToggle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.light.tint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 16,
  },
  legendContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: Colors.light.text,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 4,
  },
  legendText: {
    fontSize: 12,
    color: Colors.light.text,
  },
  listContent: {
    padding: 16,
  },
  petCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  petHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fafafa',
  },
  petImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  petInfo: {
    flex: 1,
    marginLeft: 12,
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  petBreed: {
    fontSize: 14,
    color: Colors.light.icon,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  petContent: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.light.text,
    marginLeft: 8,
  },
  notesSection: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.light.text,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.tint,
    marginLeft: 8,
  },
}); 