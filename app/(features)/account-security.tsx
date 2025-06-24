import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../contexts/AuthContext';

export default function AccountSecurityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { authAPI } = useAuth();
  
  // State variables
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('jane.smith@example.com');
  const [phone, setPhone] = useState('+1 234 567 8901');
  const [showPassword, setShowPassword] = useState(false);
  
  // Security preferences
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [passwordChangeAlerts, setPasswordChangeAlerts] = useState(true);
  const [deviceAlerts, setDeviceAlerts] = useState(true);
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  
  const goBack = () => {
    router.back();
  };
  
  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }
    
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to change password');
    }
  };
  
  const handleChangeEmail = () => {
    // In a real app, we would send a verification email and then update
    Alert.alert(
      'Verify Email Change',
      'A verification link has been sent to your new email address. Please check your inbox to confirm the change.',
    );
  };
  
  const handleChangePhone = () => {
    // In a real app, we would send an SMS verification and then update
    Alert.alert(
      'Verify Phone Change',
      'A verification code has been sent to your new phone number. Please enter it below:',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Verify',
          onPress: () => {
            Alert.alert('Success', 'Phone number changed successfully');
          },
        },
      ]
    );
  };
  
  const handleResetPasswordViaEmail = () => {
    Alert.alert(
      'Reset Password',
      'A password reset link will be sent to your email address. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send Link',
          onPress: () => {
            Alert.alert('Success', 'Password reset link sent to your email');
          },
        },
      ]
    );
  };
  
  const handleToggleTwoFactorAuth = (value: boolean) => {
    if (value) {
      // If enabling 2FA, show setup process
      Alert.alert(
        'Set Up Two-Factor Authentication',
        'Two-factor authentication adds an extra layer of security to your account. Would you like to set it up now?',
        [
          {
            text: 'Not Now',
            onPress: () => setTwoFactorAuth(false),
            style: 'cancel',
          },
          {
            text: 'Set Up',
            onPress: () => {
              setTwoFactorAuth(true);
              Alert.alert('Success', 'Two-factor authentication has been enabled');
            },
          },
        ]
      );
    } else {
      // If disabling 2FA, confirm
      Alert.alert(
        'Disable Two-Factor Authentication',
        'Are you sure you want to disable two-factor authentication? This will reduce the security of your account.',
        [
          {
            text: 'Keep Enabled',
            onPress: () => setTwoFactorAuth(true),
            style: 'cancel',
          },
          {
            text: 'Disable',
            onPress: () => {
              setTwoFactorAuth(false);
              Alert.alert('Disabled', 'Two-factor authentication has been disabled');
            },
            style: 'destructive',
          },
        ]
      );
    }
  };
  
  const handleSaveChanges = () => {
    // In a real app, we would send API requests to save all changes
    Alert.alert('Success', 'Security settings updated successfully');
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
          
          <Text style={styles.screenTitle}>Account Security</Text>
          
          <View style={styles.iconButton} />
        </View>
        
        <ScrollView 
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.sectionTitle}>Credentials</Text>
          
          {/* Change Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Change Password</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter current password"
                  secureTextEntry={!showPassword}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <IconSymbol 
                    name={showPassword ? "eye.slash" : "eye"} 
                    size={20} 
                    color={Colors.light.icon} 
                  />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter new password"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm new password"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleChangePassword}
            >
              <Text style={styles.actionButtonText}>Update Password</Text>
            </TouchableOpacity>
          </View>
          
          {/* Change Email Section */}
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Change Email Address</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <Text style={styles.helperText}>
              A verification code will be sent to the new email address
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleChangeEmail}
            >
              <Text style={styles.actionButtonText}>Update Email</Text>
            </TouchableOpacity>
          </View>
          
          {/* Change Phone Section */}
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Change Phone Number</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>
            
            <Text style={styles.helperText}>
              A verification code will be sent to the new phone number
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleChangePhone}
            >
              <Text style={styles.actionButtonText}>Update Phone</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.sectionTitle}>Security Tools</Text>
          
          {/* Reset Password Section */}
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Reset Password via Email</Text>
            
            <Text style={styles.helperText}>
              If you have trouble signing in, you can request a password reset link sent to your email address.
            </Text>
            
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleResetPasswordViaEmail}
            >
              <Text style={styles.actionButtonText}>Send Reset Link</Text>
            </TouchableOpacity>
          </View>
          
          {/* Two-Factor Authentication */}
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Two-Factor Authentication</Text>
            
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>Enable Two-Factor Authentication</Text>
              <Switch
                value={twoFactorAuth}
                onValueChange={handleToggleTwoFactorAuth}
                trackColor={{ false: '#d0d0d0', true: Colors.light.tint + '80' }}
                thumbColor={twoFactorAuth ? Colors.light.tint : '#f4f3f4'}
              />
            </View>
            
            <Text style={styles.helperText}>
              Add an extra layer of security to your account by requiring a verification code in addition to your password.
            </Text>
          </View>
          
          {/* Email Alert Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Email Alerts</Text>
            
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>Login Attempts</Text>
              <Switch
                value={loginAlerts}
                onValueChange={setLoginAlerts}
                trackColor={{ false: '#d0d0d0', true: Colors.light.tint + '80' }}
                thumbColor={loginAlerts ? Colors.light.tint : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>Password Changes</Text>
              <Switch
                value={passwordChangeAlerts}
                onValueChange={setPasswordChangeAlerts}
                trackColor={{ false: '#d0d0d0', true: Colors.light.tint + '80' }}
                thumbColor={passwordChangeAlerts ? Colors.light.tint : '#f4f3f4'}
              />
            </View>
            
            <View style={styles.toggleContainer}>
              <Text style={styles.toggleText}>New Device Login</Text>
              <Switch
                value={deviceAlerts}
                onValueChange={setDeviceAlerts}
                trackColor={{ false: '#d0d0d0', true: Colors.light.tint + '80' }}
                thumbColor={deviceAlerts ? Colors.light.tint : '#f4f3f4'}
              />
            </View>
          </View>
          
          {/* Save Button */}
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={handleSaveChanges}
          >
            <Text style={styles.saveButtonText}>Save All Changes</Text>
          </TouchableOpacity>
        </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  contentContainer: {
    paddingBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.light.tint,
    marginTop: 16,
    marginBottom: 12,
  },
  section: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
    marginBottom: 12,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: Colors.light.icon,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#FFF',
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 12,
  },
  helperText: {
    fontSize: 14,
    color: Colors.light.icon,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  actionButton: {
    backgroundColor: Colors.light.tint,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  toggleText: {
    fontSize: 16,
    color: Colors.light.text,
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
}); 