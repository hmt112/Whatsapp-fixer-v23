import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking} from 'react-native';
import RNFS from 'react-native-fs';

export default function App() {
  const [log, setLog] = useState('V7.2 ULTIMATE - One Tap Fix\n\nSteps for new user:\n1. Export WhatsApp chat WITHOUT MEDIA to Download folder\n2. Tap ALLOW button\n3. Tap FIX ALL\n4. Restart phone\n\nReady...\n');
  const [progress, setProgress] = useState(0);

  const fixAll = async () => {
    try {
      setLog('Starting...\n');
      const bases = [
        RNFS.ExternalStorageDirectoryPath + '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images',
        RNFS.ExternalStorageDirectoryPath + '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video',
        '/storage/0000-0000/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images',
      ];
      // 1 nomedia
      setLog(p=>p+'Step 1: Removing .nomedia...\n');
      for (let base of bases) {
        if (await RNFS.exists(base)) {
          const files = await RNFS.readDir(base);
          for (let f of files) {
            if (f.name === '.nomedia') {
              await RNFS.unlink(f.path);
              setLog(p=>p+'Removed .nomedia in '+base+'\n');
            }
          }
        }
      }
      setProgress(30);
      // 2 duplicates + refresh
      setLog(p=>p+'Step 2: Fixing duplicates and refreshing...\n');
      let fixed = 0;
      let dups = 0;
      const seen: any = {};
      for (let base of bases) {
        if (!(await RNFS.exists(base))) continue;
        const files = await RNFS.readDir(base);
        for (let f of files) {
          if (!f.isFile()) continue;
          if (f.name.startsWith('.')) continue;
          const key = f.name + '_' + f.size;
          if (seen[key]) {
            try { await RNFS.unlink(f.path); dups++; } catch {}
          } else {
            seen[key] = true;
            try {
              const tmp = f.path + '.tmp';
              await RNFS.moveFile(f.path, tmp);
              await RNFS.moveFile(tmp, f.path);
              fixed++;
              if (fixed % 100 === 0) setLog(p=>p+'Fixed '+fixed+'\n');
            } catch {}
          }
        }
      }
      setProgress(100);
      setLog(p=>p+'\nDONE!\nRemoved .nomedia\nDeleted '+dups+' duplicates\nRefreshed '+fixed+' files\n\nRestart phone now. Open Gallery.\n');
    } catch (e: any) {
      setLog(p=>p+'Error: '+e.message+'\n');
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>WhatsApp Fixer V7.2</Text>
      <Text style={s.s}>Ultimate One Tap + Guided</Text>
      <View style={s.card}>
        <Text style={s.cardT}>How to use (First Time)</Text>
        <Text style={s.cardD}>1. Optional: Export chat WITHOUT MEDIA to Download for exact time{'\n'}2. Tap ALLOW - enable All Files{'\n'}3. Tap FIX ALL - wait 2 min{'\n'}4. Restart phone</Text>
      </View>
      <TouchableOpacity style={s.b0} onPress={()=>Linking.openSettings()}>
        <Text style={s.bt}>0. ALLOW All Files Access</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.b1} onPress={fixAll}>
        <Text style={s.bt}>🚀 FIX ALL IN ONE TAP</Text>
      </TouchableOpacity>
      <Text style={s.p}>Progress: {progress}%</Text>
      <ScrollView style={s.log}><Text style={s.lt}>{log}</Text></ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  c: {flex:1, padding:12, paddingTop:35, backgroundColor:'#fff'},
  t: {fontSize:20, fontWeight:'bold', textAlign:'center'},
  s: {textAlign:'center', color:'#666', marginBottom:8},
  card: {backgroundColor:'#f0f0f0', padding:12, borderRadius:10, marginBottom:8},
  cardT: {fontWeight:'bold', marginBottom:4},
  cardD: {fontSize:12, color:'#444'},
  b0: {backgroundColor:'#000', padding:14, borderRadius:10, marginVertical:4},
  b1: {backgroundColor:'#00C851', padding:18, borderRadius:10, marginVertical:4},
  bt: {color:'#fff', fontWeight:'bold', textAlign:'center'},
  p: {textAlign:'center', fontWeight:'bold', marginVertical:4},
  log: {flex:1, backgroundColor:'#111', padding:10, borderRadius:8},
  lt: {color:'#0f0', fontSize:11},
});
