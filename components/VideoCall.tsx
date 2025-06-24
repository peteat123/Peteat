import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Button, Text } from 'react-native';
// @ts-ignore – the library might not ship its own types yet
import {
  TwilioVideoLocalView,
  TwilioVideoParticipantView,
  TwilioVideo,
} from 'react-native-twilio-video-webrtc';
import { videoTokenAPI } from '@/app/api/api';

interface VideoCallProps {
  roomName: string;
  identity: string;
  onEnd?: () => void;
}

export const VideoCall: React.FC<VideoCallProps> = ({ roomName, identity, onEnd }: VideoCallProps) => {
  const twilioRef = useRef<any>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  // Participants & remote video tracks keyed by Twilio SIDs
  const [videoTracks, setVideoTracks] = useState<Map<string, { participantSid: string }>>(new Map());

  // Fetch token + connect
  useEffect(() => {
    (async () => {
      try {
        const token = await videoTokenAPI.getToken(roomName);
        if (token) {
          setStatus('connecting');
          twilioRef.current?.connect({ roomName, accessToken: token });
        }
      } catch (err) {
        console.error('Unable to get Twilio token', err);
      }
    })();

    return () => {
      twilioRef.current?.disconnect();
    };
  }, [roomName]);

  const _onRoomDidConnect = () => {
    setStatus('connected');
  };
  const _onRoomDidDisconnect = () => {
    setStatus('disconnected');
    if (onEnd) onEnd();
  };
  const _onRoomDidFailToConnect = (error: any) => {
    console.warn('Twilio fail', error);
    setStatus('disconnected');
  };
  const _onParticipantAddedVideoTrack = ({ participant, track }: any) => {
    setVideoTracks((prev: Map<string, any>) => new Map(prev).set(track.trackSid, { participantSid: participant.sid, videoTrackSid: track.trackSid }));
  };
  const _onParticipantRemovedVideoTrack = ({ track }: any) => {
    setVideoTracks((prev: Map<string, any>) => {
      const map = new Map(prev);
      map.delete(track.trackSid);
      return map;
    });
  };

  const _endCall = () => {
    twilioRef.current?.disconnect();
  };

  return (
    <View style={styles.container}>
      {status === 'connected' ? (
        <View style={styles.remoteGrid}>
          {Array.from(videoTracks, ([trackSid, track]) => (
            <TwilioVideoParticipantView
              key={trackSid}
              style={styles.remoteVideo}
              trackIdentifier={{ participantSid: track.participantSid, trackSid }}
            />
          ))}
        </View>
      ) : (
        <View style={styles.center}><Text>{status === 'connecting' ? 'Connecting…' : 'Disconnected'}</Text></View>
      )}

      {/* Local preview */}
      <TwilioVideoLocalView enabled={true} style={styles.localVideo} />

      {/* Controls */}
      <View style={styles.controls}>
        <Button title={isAudioEnabled ? 'Mute' : 'Unmute'} onPress={() => {
          twilioRef.current?.setLocalAudioEnabled(!isAudioEnabled);
          setIsAudioEnabled(!isAudioEnabled);
        }} />
        <Button title={isVideoEnabled ? 'Hide Video' : 'Show Video'} onPress={() => {
          twilioRef.current?.setLocalVideoEnabled(!isVideoEnabled);
          setIsVideoEnabled(!isVideoEnabled);
        }} />
        <Button title="End" onPress={_endCall} color="red" />
      </View>

      <TwilioVideo
        ref={twilioRef}
        onRoomDidConnect={_onRoomDidConnect}
        onRoomDidDisconnect={_onRoomDidDisconnect}
        onRoomDidFailToConnect={_onRoomDidFailToConnect}
        onParticipantAddedVideoTrack={_onParticipantAddedVideoTrack}
        onParticipantRemovedVideoTrack={_onParticipantRemovedVideoTrack}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  remoteGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  remoteVideo: { width: '100%', height: 250 },
  localVideo: { position: 'absolute', bottom: 100, right: 10, width: 120, height: 160 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', padding: 10 },
});

export default VideoCall; 