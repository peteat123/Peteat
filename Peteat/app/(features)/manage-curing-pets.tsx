import { useRouter, useFocusEffect } from 'expo-router';
import React, { useState, useCallback } from 'react';
import {
  Alert,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';

// Mock pet data type
type Pet = {
  id: string;
  name: string;
  type: string;
  age: number;
  breed: string;
  sex: string;
  ownerName: string;
  ownerContact: string;
  imageUri: any;
  condition: string;
  status: 'critical' | 'stable' | 'improving' | 'recovered';
  admissionDate: string;
  lastUpdate: string;
  room?: string;
  assignedTo?: string;
};

export default function ManageCuringPetsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Mock data for pets under treatment
  const [pets, setPets] = useState<Pet[]>([
    {
      id: '1',
      name: 'Fluffy',
      type: 'Dog',
      age: 4,
      breed: 'Poodle',
      sex: 'Female',
      ownerName: 'Jane Smith',
      ownerContact: '+1 234 567 8901',
      imageUri: require('../../assets/images/robert-pisot.jpg'),
      condition: 'Post-surgery recovery',
      status: 'stable',
      admissionDate: '2023-05-15',
      lastUpdate: '2023-05-18',
      room: '103',
      assignedTo: 'Dr. Johnson'
    },
    {
      id: '2',
      name: 'Whiskers',
      type: 'Cat',
      age: 3,
      breed: 'Siamese',
      sex: 'Female',
      ownerName: 'Sarah Johnson',
      ownerContact: '+1 666 777 8888',
      imageUri: require('../../assets/images/peteat-logo.png'),
      condition: 'Post-surgery recovery',
      status: 'improving',
      admissionDate: '2023-05-16',
      lastUpdate: '2023-05-18',
      room: '102',
      assignedTo: 'Dr. Martinez'
    },
    {
      id: '3',
      name: 'Bella',
      type: 'Dog',
      age: 6,
      breed: 'Labrador',
      sex: 'Female',
      ownerName: 'Michael Taylor',
      ownerContact: '+1 555 123 4567',
      imageUri: require('../../assets/images/peteat-logo.png'),
      condition: 'Fractured leg',
      status: 'critical',
      admissionDate: '2023-05-17',
      lastUpdate: '2023-05-18',
      room: '101',
      assignedTo: 'Dr. Wilson'
    },
    {
      id: '4',
      name: 'Oliver',
      type: 'Cat',
      age: 2,
      breed: 'Maine Coon',
      sex: 'Male',
      ownerName: 'Emily Davis',
      ownerContact: '+1 678 901 2345',
      imageUri: require('../../assets/images/robert-pisot.jpg'),
      condition: 'Dental procedure',
      status: 'recovered',
      admissionDate: '2023-05-12',
      lastUpdate: '2023-05-18',
      room: '104',
      assignedTo: 'Dr. Johnson'
    }
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'record' | 'update' | 'prescribe' | 'followUp'>('record');
  
  const goBack = () => {
    router.back();
  };
  
  // Function to fetch pets from API
  const fetchPets = async () => {
    try {
      // In a real app, we would fetch pets from the API here
      // const fetchedPets = await clinic.getPetsUnderTreatment();
      // setPets(fetchedPets);
      
      // For now, we'll just use our mock data
      console.log('Fetching pets under treatment (mock data)');
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch pets under treatment. Please try again.');
      console.error('Error fetching pets:', error);
    }
  };
  
  // Fetch pets when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchPets();
    }, [])
  );
  
  // Filter pets based on search query and status filter
  const filteredPets = pets.filter(pet => {
    // Filter by search query (name, owner, or condition)
    const matchesSearch = 
      searchQuery === '' || 
      pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pet.condition.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by status
    const matchesStatus = filterStatus === null || pet.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });
  
  // Handle pet status update
  const handleUpdateStatus = (petId: string, newStatus: 'critical' | 'stable' | 'improving' | 'recovered') => {
    setPets(pets.map(pet => 
      pet.id === petId 
        ? { ...pet, status: newStatus, lastUpdate: new Date().toISOString().split('T')[0] }
        : pet
    ));
    
    Alert.alert('Status Updated', `Pet status has been updated to ${newStatus}`);
  };
  
  // Handle pet discharge
  const handleDischarge = (petId: string) => {
    Alert.alert(
      "Discharge Pet",
      "Are you sure you want to discharge this pet? This will mark them as recovered and remove them from active treatment.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Discharge", 
          onPress: () => {
            // In a real app, we would update the pet status in the database
            setPets(pets.map(pet => 
              pet.id === petId 
                ? { ...pet, status: 'recovered', lastUpdate: new Date().toISOString().split('T')[0] }
                : pet
            ));
            Alert.alert('Pet Discharged', 'Pet has been discharged successfully');
          }
        }
      ]
    );
  };
  
  // Handle view pet details
  const handleViewDetails = (pet: Pet) => {
    setSelectedPet(pet);
    // In a real app, you might navigate to a detailed view
    Alert.alert(
      `${pet.name}'s Details`,
      `Owner: ${pet.ownerName}\nContact: ${pet.ownerContact}\nCondition: ${pet.condition}\nRoom: ${pet.room}\nAssigned To: ${pet.assignedTo}\nAdmitted: ${pet.admissionDate}`,
      [{ text: "OK" }]
    );
  };
  
  // Handle contact owner
  const handleContactOwner = (pet: Pet) => {
    Alert.alert(
      `Contact ${pet.ownerName}`,
      `Call ${pet.ownerContact} or send a message?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Call", 
          onPress: () => console.log(`Calling ${pet.ownerContact}`)
        },
        { 
          text: "Message", 
          onPress: () => console.log(`Messaging ${pet.ownerContact}`)
        }
      ]
    );
  };
  
  // Render individual pet item
  const renderPetItem = ({ item }: { item: Pet }) => {
    // Function to get status color
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'critical': return '#F44336';
        case 'stable': return '#FFC107';
        case 'improving': return '#4CAF50';
        case 'recovered': return '#2196F3';
        default: return Colors.light.icon;
      }
    };
    
    return (
      <View style={[
        styles.petCard,
        item.status === 'critical' && styles.criticalCard
      ]}>
        <View style={styles.petHeader}>
          <Image 
            source={item.imageUri} 
            style={styles.petImage} 
            resizeMode="cover"
          />
          <View style={styles.petInfo}>
            <Text style={styles.petName}>{item.name}</Text>
            <Text style={styles.petDetails}>{item.breed} {item.type} • {item.age} years</Text>
            <Text style={styles.petOwner}>Owner: {item.ownerName}</Text>
            
            <View style={styles.statusContainer}>
              <View style={[
                styles.statusIndicator,
                { backgroundColor: getStatusColor(item.status) }
              ]} />
              <Text style={[
                styles.statusText,
                { color: getStatusColor(item.status) }
              ]}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.conditionContainer}>
          <Text style={styles.conditionLabel}>Condition:</Text>
          <Text style={styles.conditionText}>{item.condition}</Text>
        </View>
        
        <View style={styles.metaInfo}>
          <Text style={styles.metaText}>Room: {item.room}</Text>
          <Text style={styles.metaText}>Admitted: {item.admissionDate}</Text>
          <Text style={styles.metaText}>Last Update: {item.lastUpdate}</Text>
        </View>
        
        <View style={styles.petActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.detailsButton]} 
            onPress={() => handleViewDetails(item)}
          >
            <IconSymbol name="doc.text.fill" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Details</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.contactButton]} 
            onPress={() => handleContactOwner(item)}
          >
            <IconSymbol name="phone.fill" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Contact</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.updateButton]} 
            onPress={() => {
              Alert.alert(
                "Update Status",
                "Select new status:",
                [
                  { text: "Critical", onPress: () => handleUpdateStatus(item.id, 'critical') },
                  { text: "Stable", onPress: () => handleUpdateStatus(item.id, 'stable') },
                  { text: "Improving", onPress: () => handleUpdateStatus(item.id, 'improving') },
                  { text: "Recovered", onPress: () => handleUpdateStatus(item.id, 'recovered') },
                  { text: "Cancel", style: "cancel" }
                ]
              );
            }}
          >
            <IconSymbol name="arrow.triangle.2.circlepath" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Update</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.dischargeButton]} 
            onPress={() => handleDischarge(item.id)}
          >
            <IconSymbol name="square.and.arrow.up" size={16} color="#FFF" />
            <Text style={styles.actionButtonText}>Discharge</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top Section */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconButton} onPress={goBack}>
            <Image 
              source={require('../../assets/images/left-arrow.png')}
              style={styles.backIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
          
          <Text style={styles.screenTitle}>Pets Under Treatment</Text>
          
          <View style={styles.iconButton} />
        </View>
        
        {/* Search and Filter Section */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <IconSymbol name="magnifyingglass" size={20} color={Colors.light.icon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search pets, owners, or conditions"
              value={searchQuery}
              onChangeText={setSearchQuery}
              clearButtonMode="while-editing"
            />
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContainer}
          >
            <TouchableOpacity 
              style={[
                styles.filterButton,
                filterStatus === null && styles.activeFilter
              ]}
              onPress={() => setFilterStatus(null)}
            >
              <Text style={[
                styles.filterButtonText,
                filterStatus === null && styles.activeFilterText
              ]}>All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton,
                filterStatus === 'critical' && styles.activeFilter
              ]}
              onPress={() => setFilterStatus('critical')}
            >
              <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'critical' && styles.activeFilterText
              ]}>Critical</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton,
                filterStatus === 'stable' && styles.activeFilter
              ]}
              onPress={() => setFilterStatus('stable')}
            >
              <View style={[styles.statusDot, { backgroundColor: '#FFC107' }]} />
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'stable' && styles.activeFilterText
              ]}>Stable</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton,
                filterStatus === 'improving' && styles.activeFilter
              ]}
              onPress={() => setFilterStatus('improving')}
            >
              <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'improving' && styles.activeFilterText
              ]}>Improving</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.filterButton,
                filterStatus === 'recovered' && styles.activeFilter
              ]}
              onPress={() => setFilterStatus('recovered')}
            >
              <View style={[styles.statusDot, { backgroundColor: '#2196F3' }]} />
              <Text style={[
                styles.filterButtonText,
                filterStatus === 'recovered' && styles.activeFilterText
              ]}>Recovered</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        
        {/* Pet List */}
        <FlatList
          data={filteredPets}
          renderItem={renderPetItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <IconSymbol name="pawprint.fill" size={48} color={Colors.light.icon} />
              <Text style={styles.emptyText}>No pets under treatment</Text>
            </View>
          }
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    paddingLeft: 8,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#f0f0f0',
  },
  activeFilter: {
    backgroundColor: Colors.light.tint + '20',
  },
  filterButtonText: {
    fontSize: 14,
    color: Colors.light.text,
  },
  activeFilterText: {
    color: Colors.light.tint,
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  petCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  criticalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  petHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  petImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 12,
  },
  petInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  petName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 4,
  },
  petDetails: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 2,
  },
  petOwner: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  conditionContainer: {
    marginBottom: 12,
  },
  conditionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.light.text,
    marginBottom: 2,
  },
  conditionText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  metaInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: Colors.light.icon,
    marginRight: 12,
    marginBottom: 4,
  },
  petActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    flex: 1,
    marginHorizontal: 2,
    marginBottom: 4,
  },
  detailsButton: {
    backgroundColor: Colors.light.tint,
  },
  contactButton: {
    backgroundColor: '#4CAF50',
  },
  updateButton: {
    backgroundColor: '#FF9800',
  },
  dischargeButton: {
    backgroundColor: '#9C27B0',
  },
  actionButtonText: {
    color: '#FFF',
    marginLeft: 4,
    fontWeight: '500',
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.light.icon,
  },
}); 