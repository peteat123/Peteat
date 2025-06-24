import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
  Linking,
  Dimensions,
  ImageBackground,
  PermissionsAndroid
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Typography } from '@/constants/Typography';
import { LoadingDialog } from '@/components/ui/LoadingDialog';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useUserRole } from '../contexts/UserRoleContext';
import { useAuth } from '../contexts/AuthContext';
// @ts-ignore dynamic js module
import { videoConsultationAPI } from '../api/api';
import VideoCall from '../../components/VideoCall';
import ClinicalNoteDialog from '../../components/ui/ClinicalNoteDialog';
// @ts-ignore dynamic js module
import { clinicalNotesAPI } from '../api/api';
// @ts-ignore - expo-av types may not be available in all build environments
// import { Audio } from 'expo-av';

// WebRTC connection status
enum ConnectionStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export default function VideoConsultationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const cameraRef = useRef(null);
  const screenWidth = Dimensions.get('window').width;
  const { userRole } = useUserRole();
  const { user } = useAuth();
  
  // States
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [hasAudioPermission, setHasAudioPermission] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [consultation, setConsultation] = useState<any>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const consultationId = params?.id;
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [callDuration, setCallDuration] = useState(0);
  const [callTimer, setCallTimer] = useState<ReturnType<typeof setInterval> | null>(null);
  const [noteDialogVisible, setNoteDialogVisible] = useState(false);
  
  // Request audio permissions and fetch consultation data
  useEffect(() => {
    (async () => {
      try {
        // Check if we need to request audio permissions
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          );
          setHasAudioPermission(granted === PermissionsAndroid.RESULTS.GRANTED);
        } else {
          // On iOS (handled by expo-camera) or web we assume permission is granted for now
          setHasAudioPermission(true);
        }
        
        // Request camera permission if not yet determined
        if (cameraPermission && cameraPermission.status !== 'granted') {
          const cameraPerm = await requestCameraPermission();
          setHasCameraPermission(cameraPerm.status === 'granted');
        } else {
          setHasCameraPermission(cameraPermission?.status === 'granted');
        }
        
        // Fetch consultation data if ID provided
        if (consultationId) {
          setIsLoading(true);
          try {
            const consultationData = await videoConsultationAPI.getConsultation(consultationId);
            setConsultation(consultationData);
            
            // If consultation is in-progress, set session as active
            if (consultationData.status === 'in-progress') {
              setSessionActive(true);
              // Start call timer
              startCallTimer();
              // Indicate connecting status
              setConnectionStatus(ConnectionStatus.CONNECTING);
              // Simulate connection after a delay
              setTimeout(() => {
                setConnectionStatus(ConnectionStatus.CONNECTED);
              }, 2000);
            }
          } catch (error) {
            console.error('Error fetching consultation:', error);
            setConnectionStatus(ConnectionStatus.ERROR);
            Alert.alert(
              'Error',
              'Failed to load consultation details. Please try again.',
              [{ text: 'OK', onPress: () => router.back() }]
            );
          } finally {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Error in setup:", err);
        setHasAudioPermission(false);
      }
    })();

    // Cleanup function
    return () => {
      if (callTimer) {
        clearInterval(callTimer);
      }
    };
  }, [consultationId]);

  // Start the call timer
  const startCallTimer = () => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    setCallTimer(timer);
  };

  // Format call duration into MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Functions
  const goBack = () => {
    if (sessionActive) {
      Alert.alert(
        'End consultation?',
        'Are you sure you want to end this consultation?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'End', 
            style: 'destructive', 
            onPress: async () => {
              setIsLoading(true);
              try {
                // Cleanup the video connection
                cleanupVideoSession();
                // Update consultation status to completed
                await videoConsultationAPI.updateStatus(consultationId, 'completed');
                router.back();
              } catch (error) {
                console.error('Error ending consultation:', error);
                Alert.alert('Error', 'Failed to end consultation properly. Please try again.');
                setIsLoading(false);
              }
            } 
          }
        ]
      );
    } else {
      router.back();
    }
  };

  // Cleanup video resources
  const cleanupVideoSession = () => {
    // Clear call timer
    if (callTimer) {
      clearInterval(callTimer);
      setCallTimer(null);
    }
    
    setConnectionStatus(ConnectionStatus.DISCONNECTED);
    setSessionActive(false);
  };
  
  // Function to start the consultation
  const startConsultation = async () => {
    if (!consultationId) {
      Alert.alert('Error', 'No consultation ID provided');
      return;
    }
    
    setIsLoading(true);
    setConnectionStatus(ConnectionStatus.CONNECTING);
    
    try {
      // Update status to in-progress
      await videoConsultationAPI.updateStatus(consultationId, 'in-progress');
      setSessionActive(true);
      startCallTimer();
      
      // Simulate connection after a delay
      setTimeout(() => {
        setConnectionStatus(ConnectionStatus.CONNECTED);
        setIsLoading(false);
      }, 2000);
    } catch (error) {
      console.error('Error starting consultation:', error);
      setConnectionStatus(ConnectionStatus.ERROR);
      Alert.alert('Error', 'Failed to start consultation. Please try again.');
      setIsLoading(false);
    }
  };
  
  const openSettings = () => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  };
  
  const toggleMute = () => {
    if (!hasAudioPermission) {
      Alert.alert(
        'Microphone Access Required',
        'Please allow microphone access in your device settings to use audio features.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: openSettings }
        ]
      );
      return;
    }
    setIsMuted(!isMuted);
  };
  
  const toggleVideo = () => setIsVideoEnabled(!isVideoEnabled);
  const toggleCamera = () => setIsFrontCamera(!isFrontCamera);
  
  const performAction = (action: string, message: string) => {
    setIsLoading(true);
    setTimeout(() => {
      Alert.alert(action, message);
      setIsLoading(false);
    }, 1500);
  };
  
  const requestPrescription = () => performAction('Request E-Prescription', 'E-prescription request has been sent.');
  const openMedicalRecord = () => performAction('Medical Record', 'Medical record viewer will be available soon.');
  const sendPrescription = () => performAction('Send E-Prescription', 'E-prescription form will be available soon.');
  const addDiagnosis = () => {
    setNoteDialogVisible(true);
  };
  const addNotes = () => performAction('Add Notes', 'Notes editor will be available soon.');
  
  const completeConsultation = () => {
    setNoteDialogVisible(true); // capture final note
  };
  
  // Handle save from dialog
  const handleSaveNote = async (data: any) => {
    try {
      setIsLoading(true);
      if (!consultationId || !consultation?.pet?._id) throw new Error('Missing consultation or pet');
      await clinicalNotesAPI.create({
        consultation: consultationId,
        pet: consultation.pet._id,
        ...data,
      });

      // mark consultation completed when saving from complete action
      await videoConsultationAPI.updateStatus(consultationId, 'completed');
      Alert.alert('Saved', 'Clinical note saved successfully.');
      router.back();
    } catch (err: any) {
      console.warn('Save note error', err);
      Alert.alert('Error', err.message || 'Failed to save note');
    } finally {
      setIsLoading(false);
      setNoteDialogVisible(false);
    }
  };
  
  // Permissions handling
  if (!cameraPermission) {
    // Camera permissions are still loading
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.cameraPlaceholder}>
          <IconSymbol name="camera.fill" size={60} color={colors.tint} />
          <Text style={[Typography.nunitoBodyMedium, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
            Requesting camera permission...
          </Text>
        </View>
      </View>
    );
  }

  if (!cameraPermission.granted) {
    // Camera permissions not granted
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.cameraPlaceholder}>
          <IconSymbol name="camera.fill" size={60} color={colors.tint} />
          <Text style={[Typography.nunitoBodyMedium, { color: colors.text, marginTop: 16, textAlign: 'center' }]}>
            Camera Access Required
          </Text>
          <Text style={[Typography.nunitoCaption, { color: colors.text, marginTop: 8, textAlign: 'center', marginHorizontal: 20 }]}>
            Please allow camera access to use video consultation features.
          </Text>
          <TouchableOpacity 
            style={[styles.cameraButton, { backgroundColor: colors.tint }]}
            onPress={requestCameraPermission}
          >
            <Text style={styles.cameraButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.cameraButton, { backgroundColor: colors.tint, marginTop: 10 }]}
            onPress={openSettings}
          >
            <Text style={styles.cameraButtonText}>Open Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Connection status UI
  const renderConnectionStatus = () => {
    if (connectionStatus === ConnectionStatus.CONNECTING) {
      return (
        <View style={styles.connectionIndicator}>
          <Text style={[Typography.nunitoCaption, { color: 'white', marginRight: 8 }]}>
            Connecting...
          </Text>
          <ActivityIndicator size="small" color="white" />
        </View>
      );
    } else if (connectionStatus === ConnectionStatus.CONNECTED) {
      return (
        <View style={[styles.connectionIndicator, { backgroundColor: colors.success }]}>
          <Text style={[Typography.nunitoCaption, { color: 'white' }]}>
            Connected
          </Text>
        </View>
      );
    } else if (connectionStatus === ConnectionStatus.ERROR) {
      return (
        <TouchableOpacity 
          style={[styles.connectionIndicator, { backgroundColor: colors.error }]}
          onPress={() => {
            setConnectionStatus(ConnectionStatus.CONNECTING);
            setTimeout(() => {
              setConnectionStatus(ConnectionStatus.CONNECTED);
            }, 2000);
          }}
        >
          <Text style={[Typography.nunitoCaption, { color: 'white' }]}>
            Reconnect
          </Text>
        </TouchableOpacity>
      );
    }
    
    return null;
  };
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colorScheme === 'dark' ? 'rgba(41,47,54,0.9)' : 'rgba(255,251,247,0.9)' }]}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <IconSymbol name="phone.down.fill" size={24} color={colors.error} />
          <Text style={[styles.endCallText, { color: colors.error }]}>End Call</Text>
        </TouchableOpacity>
        
        <Text style={[Typography.nunitoSubheading, { color: colors.text }]}>
          {userRole === 'user' ? 'Consultation with Doctor' : 'Patient Consultation'}
        </Text>
        
        {/* Call timer */}
        {sessionActive && (
          <View style={styles.timerContainer}>
            <IconSymbol name="clock" size={14} color={colors.text} style={{ marginRight: 4 }} />
            <Text style={[Typography.nunitoCaption, { color: colors.text }]}>
              {formatDuration(callDuration)}
            </Text>
          </View>
        )}
      </View>
      
      {/* Main Content */}
      <View style={styles.videoContainer}>
        {/* Main Video area */}
        {sessionActive ? (
          <VideoCall roomName={consultationId as string} identity={user?.id ?? ''} onEnd={completeConsultation} />
        ) : (
          <View style={styles.startConsultationContainer}>
            <IconSymbol name="video.fill" size={48} color="white" />
            <Text style={[Typography.nunitoBodyMedium, { color: 'white', marginTop: 12, textAlign: 'center' }]}>
              {consultation ? 'Ready to start video consultation' : 'Loading consultation details...'}
            </Text>
            {consultation && !sessionActive && (
              <TouchableOpacity
                style={styles.startButton}
                onPress={startConsultation}
                disabled={isLoading}
              >
                <Text style={styles.startButtonText}>Start Consultation</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      
      {/* Controls */}
      {sessionActive && (
        <View style={[styles.controls, { backgroundColor: colorScheme === 'dark' ? 'rgba(41,47,54,0.9)' : 'rgba(255,251,247,0.9)' }]}>
          <TouchableOpacity
            style={[styles.controlButton, isMuted && styles.controlButtonActive]}
            onPress={toggleMute}
          >
            <IconSymbol
              name={isMuted ? "mic.slash.fill" : "mic.fill"}
              size={22}
              color={isMuted ? "white" : colors.text}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, !isVideoEnabled && styles.controlButtonActive]}
            onPress={toggleVideo}
          >
            <IconSymbol
              name={isVideoEnabled ? "video.fill" : "video.slash.fill"}
              size={22}
              color={!isVideoEnabled ? "white" : colors.text}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleCamera}
          >
            <IconSymbol name="arrow.triangle.2.circlepath.camera.fill" size={22} color={colors.text} />
          </TouchableOpacity>
          
          {/* Add more control buttons as needed */}
        </View>
      )}
      
      {/* Patient information & options area (doctor view) */}
      {sessionActive && userRole === 'clinic' && consultation?.pet && (
        <ScrollView
          style={styles.infoContainer}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom || 16 }}
        >
          <View style={styles.patientInfoCard}>
            <View style={styles.petInfoHeader}>
              <Image
                source={consultation.pet.profileImage ? { uri: consultation.pet.profileImage } : require('../../assets/images/robert-pisot.jpg')}
                style={styles.petImage}
              />
              <View style={styles.petDetails}>
                <Text style={[Typography.nunitoHeading3, { color: colors.text }]}>
                  {consultation.pet.name}
                </Text>
                <Text style={[Typography.nunitoCaption, { color: colors.text }]}>
                  {consultation.pet.species} • {consultation.pet.breed} • {consultation.pet.age} years
                </Text>
                <Text style={[Typography.nunitoCaption, { color: colors.text }]}>
                  Owner: {consultation.petOwner.fullName}
                </Text>
              </View>
            </View>
            
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.actionButton} onPress={openMedicalRecord}>
                <IconSymbol name="doc.text.fill" size={18} color={colors.tint} />
                <Text style={styles.actionButtonText}>Medical Record</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={addDiagnosis}>
                <IconSymbol name="clipboard.fill" size={18} color={colors.tint} />
                <Text style={styles.actionButtonText}>Add Diagnosis</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={sendPrescription}>
                <IconSymbol name="pills.fill" size={18} color={colors.tint} />
                <Text style={styles.actionButtonText}>E-Prescription</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={addNotes}>
                <IconSymbol name="square.and.pencil" size={18} color={colors.tint} />
                <Text style={styles.actionButtonText}>Notes</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.completeButton, { backgroundColor: colors.tint }]}
                onPress={completeConsultation}
              >
                <Text style={styles.completeButtonText}>Complete Consultation</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
      
      {/* Patient options area (patient view) */}
      {sessionActive && userRole === 'user' && (
        <View style={styles.patientOptionsContainer}>
          <TouchableOpacity style={styles.patientOptionButton} onPress={requestPrescription}>
            <IconSymbol name="pills.fill" size={22} color={colors.tint} />
            <Text style={styles.patientOptionText}>Request E-Prescription</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Loading indicator */}
      <LoadingDialog visible={isLoading} message={connectionStatus === ConnectionStatus.CONNECTING ? "Connecting..." : "Loading..."} />
      
      {/* Clinical note input */}
      <ClinicalNoteDialog
        visible={noteDialogVisible}
        onClose={() => setNoteDialogVisible(false)}
        onSave={handleSaveNote}
      />
    </View>
  );
}

// Import missing components
const ActivityIndicator = (props: { size: "small" | "large", color: string }) => (
  <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: props.color }}></View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 16,
  },
  endCallText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localVideo: {
    position: 'absolute',
    width: 120,
    height: 180,
    right: 16,
    top: 16,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'white',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    zIndex: 10,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(200,200,200,0.3)',
    marginHorizontal: 8,
  },
  controlButtonActive: {
    backgroundColor: 'rgba(255,59,48,0.8)',
  },
  infoContainer: {
    maxHeight: 250,
    backgroundColor: 'rgba(245,245,245,0.95)',
  },
  patientInfoCard: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  petInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  petImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  petDetails: {
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  completeButton: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  completeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  patientOptionsContainer: {
    padding: 16,
  },
  patientOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
  },
  patientOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 20,
  },
  cameraButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  videoDisabledContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#34495e',
    width: '100%',
    height: '100%',
  },
  startConsultationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  startButton: {
    backgroundColor: '#4CD964',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 20,
  },
  startButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  remoteName: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  remoteAudioIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,59,48,0.8)',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  localAudioIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(255,59,48,0.8)',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectionIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  }
});