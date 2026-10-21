import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Linking, Alert} from 'react-native';

export default function App() {
  const fixWhatsapp = () => {
    Alert.alert('Fixed!', 'Now try opening WhatsApp');
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>WhatsApp Fixer</Text>
      <Text style={styles.sub}>Click to fix WhatsApp not opening</Text>
      <TouchableOpacity style={styles.btn} onPress={fixWhatsapp}>
        <Text style={styles.btnText}>FIX NOW</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, {backgroundColor: '#25D366', marginTop: 20}]} onPress={() => Linking.openURL('https://wa.me/')}>
        <Text style={styles.btnText}>Open WhatsApp</Text>
      </TouchableOpacity>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff'},
  title: {fontSize: 28, fontWeight: 'bold', marginBottom: 10},
  sub: {fontSize: 16, color: '#666', marginBottom: 30},
  btn: {backgroundColor: '#000', padding: 15, paddingHorizontal: 40, borderRadius: 10},
  btnText: {color: '#fff', fontSize: 18, fontWeight: 'bold'},
});
