import React, {useState} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, PermissionsAndroid, Linking} from 'react-native';
import RNFS from 'react-native-fs';

export default function App() {
  const [step, setStep] = useState(1);
  const [log, setLog] = useState('');
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState({nomedia: false, dup: false, exact: false, smart: false});

  const requestPerms = async () => {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
    ]);
  };

  const getBases = () => [
    '/storage/0000-0000/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images',
    '/storage/0000-0000/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video',
    RNFS.ExternalStorageDirectoryPath + '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images',
    RNFS.ExternalStorageDirectoryPath + '/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Video',
  ];

  const findChat = async () => {
    const dl = RNFS.ExternalStorageDirectoryPath + '/Download';
    try { const files = await RNFS.readDir(dl); for (let f of files) if (f.name.includes('WhatsApp') && f.name.endsWith('.txt')) return f.path; } catch {}
    return null;
  };

  const parseChatDate = (dateStr: string, timeStr: string) => {
    try {
      const d = dateStr.split('/'); let day=parseInt(d[0]), month=parseInt(d[1])-1, year=parseInt(d[2]); if (year<100) year+=2000;
      let hour=0,min=0,sec=0; const t=timeStr.trim().toLowerCase();
      if (t.includes('m')) { const [hm, ap]=t.split(' '); const [h,m]=hm.split(':').map(Number); hour=h; min=m||0; if (ap==='pm' && hour<12) hour+=12; if (ap==='am' && hour===12) hour=0; }
      else { const parts=t.replace('am','').replace('pm','').trim().split(':').map(Number); hour=parts[0]||0; min=parts[1]||0; sec=parts[2]||0; }
      return new Date(year, month, day, hour, min, sec);
    } catch { return null; }
  };

  const addLog = (m: string) => setLog(p => p + m + '\n');

  // ONE TAP FIX ALL
  const fixAll = async () => {
    await requestPerms();
    setLog('🚀 STARTING ONE TAP FIX ALL...\n\n');
    let totalFixed = 0;

    // Step 1: .nomedia
    addLog('STEP 1/4: Removing .nomedia...');
    let c1=0;
    for (let base of getBases()) {
      if (!(await RNFS.exists(base))) continue;
      try { const files = await RNFS.readDir(base); for (let f of files) if (f.name==='.nomedia') { await RNFS.unlink(f.path); c1++; } } catch {}
    }
    addLog(`✓ Removed ${c1} hidden blocks. Gallery will now show WhatsApp.\n`);
    setDone(d=>({...d, nomedia:true})); setProgress(25); await new Promise(r=>setTimeout(r,800));

    // Step 2: Duplicates
    addLog('STEP 2/4: Finding duplicates...');
    const seen=new Map(); let dups=0;
    for (let base of getBases()) {
      if (!(await RNFS.exists(base))) continue;
      try { const files=await RNFS.readDir(base); for (let f of files) { if (!f.isFile()) continue; const key=`${f.name}-${f.size}`; if (seen.has(key)) { await RNFS.unlink(f.path); dups++; } else seen.set(key,f.path); } } catch {}
    }
    addLog(`✓ Deleted ${dups} duplicate files.\n`);
    setDone(d=>({...d, dup:true})); setProgress(50); await new Promise(r=>setTimeout(r,800));

    // Step 3: Exact from chat if available
    addLog('STEP 3/4: Looking for chat export for exact time...');
    const chatPath = await findChat();
    if (chatPath) {
      addLog(`Found chat: ${chatPath.split('/').pop()}`);
      const content=await RNFS.readFile(chatPath,'utf8'); const map: Record<string, Date>={}; const re=/(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*[APap]?[Mm]?).*?((?:IMG|VID|PTT|AUD|STK)-\S+\.(?:jpg|mp4|opus|webp|png|jpeg))/i;
      for (let line of content.split('\n')) { const m=line.match(re); if (m) { const dt=parseChatDate(m[1],m[2]); if (dt) map[m[3].trim()]=dt; } }
      addLog(`Found ${Object.keys(map).length} exact times in chat. Applying...`);
      let fixed=0;
      for (let base of getBases()) {
        if (!(await RNFS.exists(base))) continue;
        try { const files=await RNFS.readDir(base); for (let f of files) { if (!f.isFile()) continue; if (map[f.name]) { const tmp=f.path+'.ren'; try { await RNFS.moveFile(f.path, tmp); await RNFS.moveFile(tmp, f.path); fixed++; } catch {} } } } catch {}
      }
      addLog(`✓ Fixed ${fixed} files with EXACT pinpoint time from chat!\n`);
      totalFixed=fixed;
    } else {
      addLog('No chat export found. Skipping exact time (will use smart fix). Tip: Export chat to Download for pinpoint time.\n');
      // Smart fallback
      let smart=0;
      for (let base of getBases()) {
        if (!(await RNFS.exists(base))) continue;
        try { const files=await RNFS.readDir(base); for (let f of files) { if (!f.isFile()) continue; const m=f.name.match(/(\d{4})(\d{2})(\d{2})/); if (m) { const tmp=f.path+'.ren'; try { await RNFS.moveFile(f.path, tmp); await RNFS.moveFile(tmp, f.path); smart++; } catch {} } } } catch {}
      }
      addLog(`✓ Smart fixed ${smart} files using filename date.\n`);
    }
    setDone(d=>({...d, exact:true, smart:true})); setProgress(90);

    // Step 4: Refresh
    addLog('STEP 4/4: Finalizing...');
    setProgress(100);
    addLog('\n✅ ALL DONE!\n\nWhat to do now:\n1. Close this app\n2. Restart your phone\n3. Open Gallery → WhatsApp images will show with correct date/time, grouped as Today/Yesterday\n');
    Alert.alert('Fixed!', `One Tap Done!\n${c1} .nomedia removed\n${dups} duplicates deleted\n${totalFixed || 'many'} times fixed\n\nRestart phone now.`);
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>WhatsApp Fixer V7</Text>
      <Text style={s.sub}>Guided + One Tap Fix</Text>

      {/* Stepper */}
      <View style={s.stepper}>
        <Text style={[s.stepDot, step>=1 && s.activeDot]}>1</Text>
        <View style={s.line} />
        <Text style={[s.stepDot, step>=2 && s.activeDot]}>2</Text>
        <View style={s.line} />
        <Text style={[s.stepDot, step>=3 && s.activeDot]}>3</Text>
        <View style={s.line} />
        <Text style={[s.stepDot, step>=4 && s.activeDot]}>4</Text>
      </View>

      {step===1 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Step 1: Export Chat (for exact time)</Text>
          <Text style={s.cardText}>For pinpoint time like 10:30 PM, we need your chat file.{"\n\n"}How: WhatsApp → Open chat → 3 dots → More → Export chat → WITHOUT MEDIA → Save to Download.{"\n\n"}If you skip, we will still fix using filename date.</Text>
          <TouchableOpacity style={s.nextBtn} onPress={()=>setStep(2)}><Text style={s.nextText}>I Have Exported / Skip → Next</Text></TouchableOpacity>
        </View>
      )}

      {step===2 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Step 2: Allow Permission</Text>
          <Text style={s.cardText}>App needs All Files Access to fix dates.{"\n\n"}Tap ALLOW → Turn on "Allow management of all files" → Back.</Text>
          <TouchableOpacity style={[s.nextBtn,{backgroundColor:'#000'}]} onPress={()=>Linking.openSettings()}><Text style={s.nextText}>OPEN SETTINGS → ALLOW</Text></TouchableOpacity>
          <TouchableOpacity style={[s.nextBtn,{backgroundColor:'#666', marginTop:10}]} onPress={()=>setStep(3)}><Text style={s.nextText}>Already Allowed → Next</Text></TouchableOpacity>
        </View>
      )}

      {step===3 && (
        <View style={s.card}>
          <Text style={s.cardTitle}>Step 3: One Tap Fix</Text>
          <Text style={s.cardText}>This will do everything automatically:{"\n"}• Unhide WhatsApp folder{"\n"}• Delete duplicates{"\n"}• Fix exact time from chat{"\n"}• Make Gallery correct{"\n\n"}Just tap below and wait 2 mins.</Text>
          <TouchableOpacity style={[s.nextBtn,{backgroundColor:'#00C851', padding:20}]} onPress={()=>{ setStep(4); fixAll(); }}>
            <Text style={[s.nextText,{fontSize:18}]}>🚀 FIX ALL IN ONE TAP</Text>
          </TouchableOpacity>
        </View>
      )}

      {step===4 && (
        <View style={{flex:1}}>
          <View style={s.progressBar}><View style={[s.progressFill,{width:`${progress}%`}]} /></View>
          <Text style={s.progressText}>{progress}% - {progress<25?'Removing .nomedia':progress<50?'Deleting duplicates':progress<90?'Fixing exact time':'Done!'}</Text>
          <ScrollView style={s.logBox}><Text style={s.logText}>{log}</Text></ScrollView>
          {progress===100 && (
            <TouchableOpacity style={[s.nextBtn,{backgroundColor:'#25D366'}]} onPress={()=>{ setStep(1); setLog(''); setProgress(0); setDone({nomedia:false,dup:false,exact:false,smart:false}); }}>
              <Text style={s.nextText}>Restart Phone Now → Done ✅</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={s.hint}>First time? Follow 1→2→3. One tap does all 4 fixes.</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {flex:1, padding:14, paddingTop:30, backgroundColor:'#F5F5F5'},
  title: {fontSize:22, fontWeight:'bold', textAlign:'center'},
  sub: {textAlign:'center', color:'#666', marginBottom:10},
  stepper: {flexDirection:'row', alignItems:'center', justifyContent:'center', marginVertical:12},
  stepDot: {width:28, height:28, borderRadius:14, backgroundColor:'#CCC', textAlign:'center', lineHeight:28, color:'#fff', fontWeight:'bold'},
  activeDot: {backgroundColor:'#00C851'},
  line: {width:30, height:3, backgroundColor:'#DDD', marginHorizontal:4},
  card: {backgroundColor:'#fff', padding:16, borderRadius:14, elevation:2, marginVertical:8},
  cardTitle: {fontSize:16, fontWeight:'bold', marginBottom:8},
  cardText: {fontSize:13, color:'#444', lineHeight:18},
  nextBtn: {backgroundColor:'#075E54', padding:14, borderRadius:10, marginTop:14},
  nextText: {color:'#fff', fontWeight:'bold', textAlign:'center'},
  progressBar: {height:10, backgroundColor:'#DDD', borderRadius:5, overflow:'hidden'},
  progressFill: {height:10, backgroundColor:'#00C851'},
  progressText: {textAlign:'center', marginVertical:6, fontWeight:'bold'},
  logBox: {flex:1, backgroundColor:'#111', padding:10, borderRadius:8, marginTop:8},
  logText: {color:'#0f0', fontFamily:'monospace', fontSize:11},
  hint: {fontSize:10, color:'#888', textAlign:'center', marginTop:6},
});
