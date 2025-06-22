import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Request permissions and return the Expo push token, or null if not granted/unsupported.
export const registerForPushNotificationsAsync = async (): Promise<string | null> => {
  try {
    if (!Device.isDevice) {
      console.log('Push notifications: not running on physical device');
      return null;
    }

    // Get existing status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Ask if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission not granted');
      return null;
    }

    // Some Android configs
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    console.log('Obtained push token', tokenData.data);
    return tokenData.data;
  } catch (err) {
    console.error('Error registering for push notifications', err);
    return null;
  }
}; 