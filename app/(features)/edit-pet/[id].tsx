import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../../components/ui/IconSymbol';
import { Colors } from '../../../constants/Colors';
import { petAPI } from '../../api/api';
import * as ImagePicker from 'expo-image-picker';
import { LoadingDialog } from '@/components/ui/LoadingDialog';

export default function EditPetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [breed, setBreed] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [weight, setWeight] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const goBack = () => router.back();

  /** Fetch pet details **/
  useEffect(() => {
    const fetchPetDetails = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await petAPI.getPet(id);
        setName(data.name || '');
        setSpecies(data.species || '');
        setBreed(data.breed || '');
        setAge(data.age?.toString() || '');
        setGender(data.gender || '');
        setWeight(data.weight?.toString() || '');
        if (data.profileImage) {
          setPhoto(data.profileImage);
        }
      } catch (err) {
        Alert.alert('Error', 'Unable to load pet details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPetDetails();
  }, [id]);

  const selectImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow gallery access');
        return;
      }
      
      console.log('Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({ 
        mediaTypes: ImagePicker.MediaTypeOptions.Images, 
        allowsEditing: true, 
        aspect: [1, 1], 
        quality: 1.0  // Use maximum quality
      });
      
      if (!result.canceled) {
        const selectedUri = result.assets[0].uri;
        console.log('Selected image URI:', selectedUri);
        setPhoto(selectedUri);
      } else {
        console.log('Image selection canceled');
      }
    } catch (err) {
      console.error('Image selection error:', err);
      Alert.alert('Error', 'Image selection failed');
    }
  };

  const handleSave = async () => {
    if (!id) return;
    if (!name.trim() || !species.trim()) {
      Alert.alert('Missing fields', 'Name and species are required');
      return;
    }
    try {
      setIsLoading(true);
      
      // Create the payload
      const payload: any = {
        name: name.trim(),
        species: species.trim(),
        breed: breed.trim() || undefined,
        age: age ? parseInt(age, 10) : undefined,
        gender: gender.trim() || undefined,
        weight: weight ? parseFloat(weight) : undefined,
      };
      
      // If there's a new photo (not a URL), upload it first
      if (photo && !photo.startsWith('http')) {
        try {
          // Use the uploadImage function from petAPI
          const imageUrl = await petAPI.uploadImage(photo);
          console.log('Image upload success:', imageUrl);
          
          // Set the returned URL in the payload
          payload.profileImage = imageUrl;
        } catch (uploadErr: any) {
          console.error('Image upload error:', uploadErr);
          Alert.alert('Warning', 'Failed to upload image, continuing with pet info update only');
          // Continue without the image
        }
      }
      
      // Update the pet with the payload
      await petAPI.updatePet(id, payload);
      Alert.alert('Success', 'Pet updated', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      console.error('Save error:', err);
      Alert.alert('Error', 'Update failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top }]}>        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Image source={require('../../../assets/images/left-arrow.png')} style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Pet</Text>
          <View style={{ width: 40 }} />
        </View>

        {isLoading && <LoadingDialog visible message="Loading..." />}

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          {/* Photo */}
          <TouchableOpacity style={styles.photoContainer} onPress={selectImage}>
            {photo ? (
              <Image source={{ uri: photo }} style={styles.petPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <IconSymbol name="camera.fill" size={40} color={Colors.light.icon} />
                <Text style={styles.photoText}>Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Form */}
          <View style={styles.form}>
            {/* Name */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Name*</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
            </View>
            {/* Species */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Species*</Text>
              <TextInput style={styles.input} value={species} onChangeText={setSpecies} />
            </View>
            {/* Breed */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Breed</Text>
              <TextInput style={styles.input} value={breed} onChangeText={setBreed} />
            </View>
            {/* Age */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />
            </View>
            {/* Gender */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Gender</Text>
              <TextInput style={styles.input} value={gender} onChangeText={setGender} />
            </View>
            {/* Weight */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput style={styles.input} value={weight} onChangeText={setWeight} keyboardType="numeric" />
            </View>
          </View>

          {/* Save */}
          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isLoading}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.light.text },
  content: { flex: 1 },
  contentContainer: { padding: 16, paddingBottom: 40 },
  photoContainer: { alignSelf: 'center', marginBottom: 16 },
  petPhoto: { width: 120, height: 120, borderRadius: 60 },
  photoPlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' },
  photoText: { marginTop: 6, color: Colors.light.icon },
  form: {},
  inputContainer: { marginBottom: 12 },
  inputLabel: { marginBottom: 4, color: Colors.light.text, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  saveButton: { backgroundColor: Colors.light.tint, borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
}); 