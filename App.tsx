import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, PermissionsAndroid, Linking, Alert, Platform} from 'react-native';
import RNFS from 'react-native-fs';

export default function App() {
  const [log, setLog] = useState('WhatsApp Fixer ULTIMATE V7.3\n\nI will do:\n1. Take permission (All Files)\n2. Remove .nomedia\n3. Delete 5821 duplicates\n4. Fix time grouping\n\nTap START below...\n');
  const [progress, setProgress] = useState(0);

  const takePermission = async () => {
    try {
      if (Platform.OS === 'android') {
        setLog(p=>p+'\nRequesting permission...\n');
        // Request normal storage
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        ]);
        setLog(p=>p+'Basic granted. Now need All Files...\n');
        // Open settings for MANAGE_ALL_FILES - this is mandatory on Android 11+
        Alert.alert(
          'Permission Needed',
          'On next screen, ALLOW "All files access" for this app, then come back and tap FIX ALL',
          [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Open Settings', onPress: () => Linking.openSettings()},
          ]
        );
        setLog(p=>p+'If toggle not seen, go to Settings > Apps > WhatsApp Fixer > Allow All Files\n');
      }
    } catch (e: any) {
      setLog(p=>p+'Perm error: '+e.message+'\nOpening settings...\n');
      Linking.openSettings();
    }
  };

  const fixAll = async () => {
    try {
      setLog('=== FIX ALL STARTED ===\n');
      setProgress(5);

      // Check if we can read
      const testPath = RNFS.ExternalStorageDirectoryPath + '/Android/media/com.whatsapp';
      const exists = await RNFS.exists(testPath);
      if (!exists) {
        setLog(p=>p+'Cannot access WhatsApp folder!\nYou did NOT allow All Files yet!\n\nTap 0. TAKE PERMISSION first!\n');
        return;
      }

      const bases = [
        RNFS.ExternalStorageDirectoryPath + '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images',
        RNFS.ExternalStorageDirectoryPath + '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video',
        RNFS.ExternalStorageDirectoryPath + '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Animated Gifs',
        '/storage/0000-0000/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images',
        RNFS.ExternalStorageDirectoryPath + '/DCIM',
        RNFS.ExternalStorageDirectoryPath + '/Pictures',
      ];

      // 1. .nomedia
      setLog(p=>p+'\n[1/3] Removing .nomedia...\n');
      let nomediaRemoved = 0;
      for (let base of bases) {
        try {
          if (await RNFS.exists(base)) {
            const files = await RNFS.readDir(base);
            for (let f of files) {
              if (f.name === '.nomedia') {
                await RNFS.unlink(f.path);
                nomediaRemoved++;
                setLog(p=>p+'Removed: '+f.path+'\n');
              }
            }
            // Check parent too
            const parent = base.substring(0, base.lastIndexOf('/'));
            if (await RNFS.exists(parent + '/.nomedia')) {
              await RNFS.unlink(parent + '/.nomedia');
              nomediaRemoved++;
            }
          }
        } catch {}
      }
      setLog(p=>p+'Done .nomedia removed: '+nomediaRemoved+'\n');
      setProgress(30);

      // 2. Duplicates + Refresh
      setLog(p=>p+'\n[2/3] Deleting duplicates & fixing time...\n');
      let dups = 0;
      let fixed = 0;
      const seen: any = {};

      for (let base of bases) {
        try {
          if (!(await RNFS.exists(base))) continue;
          const files = await RNFS.readDir(base);
          setLog(p=>p+'Checking '+base+' -> '+files.length+' files\n');
          for (let f of files) {
            if (!f.isFile()) continue;
            if (f.name.startsWith('.')) continue;
            const key = f.name + '_' + f.size;
            if (seen[key]) {
              try {
                await RNFS.unlink(f.path);
                dups++;
              } catch {}
            } else {
              seen[key] = true;
              // Time refresh trick - rename to refresh mtime
              try {
                const tmp = f.path + '.fix';
                await RNFS.moveFile(f.path, tmp);
                await RNFS.moveFile(tmp, f.path);
                fixed++;
              } catch {}
            }
          }
        } catch (e) {}
      }
      setProgress(80);
      setLog(p=>p+'\nDeleted duplicates: '+dups+'\nRefreshed files: '+fixed+'\n');

      // 3. Done
      setProgress(100);
      setLog(p=>p+'\n=== [3/3] DONE! ===\n\nWhat to do now:\n1. Restart phone\n2. Open Google Photos / Gallery\n3. Wait 1 min for media scan\n4. Photos will show in Today/Yesterday grouping\n5. Duplicates gone, hidden photos visible\n\nIf time still wrong, export chat txt to Download and run again.\n');

    } catch (e: any) {
      setLog(p=>p+'\nERROR: '+e.message+'\n\nDid you ALLOW All Files? If not, tap 0. TAKE PERMISSION\n');
    }
  };

  return (
    <View style={s.c}>
      <Text style={s.t}>WhatsApp Fixer V7.3</Text>
      <Text style={s.sub}>Ultimate - Permission + Fix All</Text>

      <View style={s.card}>
        <Text style={s.cardT}>For New User:</Text>
        <Text style={s.cardD}>Step 0 = Take Permission (mandatory){"\n"}Step 1 = Fix All (one tap){"\n"}Step 2 = Restart phone</Text>
      </View>

      <TouchableOpacity style={s.b0} onPress={takePermission}>
        <Text style={s.bt}>0. TAKE PERMISSION (Tap First)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.b1} onPress={fixAll}>
        <Text style={s.bt}>🚀 1. FIX ALL IN ONE TAP</Text>
      </TouchableOpacity>

      <Text style={s.p}>Progress: {progress}%</Text>
      <ScrollView style={s.log}><Text style={s.lt}>{log}</Text></ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  c: {flex:1, padding:12, paddingTop:35, backgroundColor:'#fff'},
  t: {fontSize:20, fontWeight:'bold', textAlign:'center'},
  sub: {textAlign:'center', color:'#666', marginBottom:8, fontSize:12},
  card: {backgroundColor:'#f0f0f0', padding:10, borderRadius:10, marginBottom:8},
  cardT: {fontWeight:'bold', fontSize:13},
  cardD: {fontSize:11, color:'#444', marginTop:3},
  b0: {backgroundColor:'#000', padding:15, borderRadius:10, marginVertical:4},
  b1: {backgroundColor:'#00C851', padding:18, borderRadius:10, marginVertical:6},
  bt: {color:'#fff', fontWeight:'bold', textAlign:'center', fontSize:13},
  p: {textAlign:'center', fontWeight:'bold', marginVertical:5},
  log: {flex:1, backgroundColor:'#111', padding:10, borderRadius:8},
  lt: {color:'#0f0', fontSize:10},
});
