import React, { useEffect, useState } from 'react';
import { View, FlatList, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
// @ts-ignore
import { nfcTagAPI } from '../api/api';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { initializeSocket, addSocketListener, removeSocketListenerById } from '../../utils/socket';

export default function LostPetsScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [lostPets, setLostPets] = useState<any[]>([]);

  useEffect(() => { fetchFeed(); }, []);

  useEffect(() => {
    (async () => { await initializeSocket(); })();
    const id = addSocketListener('lostPetUpdate', (payload: any) => {
      if(payload.action==='lost') setLostPets(prev=>[payload.tag,...prev]);
      if(payload.action==='found') setLostPets(prev=>prev.filter(t=>t._id!==payload.tag._id));
    });
    return ()=>{ removeSocketListenerById(id); };
  }, []);

  const fetchFeed = async () => {
    try { const data = await nfcTagAPI.getLostPets(); setLostPets(data); } catch(e){ console.log(e); }
  };

  const renderItem = ({ item }: { item:any }) => (
    <View style={styles.card}>
      <Image source={ item.pet.profileImage ? {uri:item.pet.profileImage}: require('../../assets/images/doggy.png')} style={styles.img} />
      <View style={{flex:1, marginLeft:10}}>
        <Text style={styles.name}>{item.pet.name}</Text>
        <Text>{item.pet.breed} • {item.pet.age}y</Text>
        <Text>Owner: {item.pet.owner.fullName}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container,{paddingTop:insets.top}]}> 
      <View style={styles.header}><IconSymbol name="pawprint.fill" size={20} color={colors.text} /><Text style={styles.title}> Lost Pets Nearby</Text></View>
      <FlatList data={lostPets} keyExtractor={i=>i._id} renderItem={renderItem} contentContainerStyle={{padding:16}} />
    </View>
  );
}

const styles=StyleSheet.create({
  container:{flex:1},
  header:{flexDirection:'row',alignItems:'center',padding:16},
  title:{fontSize:20,fontWeight:'600',marginLeft:8},
  card:{flexDirection:'row',backgroundColor:'#fff',padding:12,borderRadius:8,marginBottom:10, elevation:2},
  img:{width:60,height:60,borderRadius:30}
}); 