import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Image, TouchableOpacity, GestureResponderEvent } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { dummyUsers } from '../../constants/dummyUsers'; 
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Header } from '@/components/header';

const { height, width } = Dimensions.get('window');
const BLOOM_COLOR = '#FF5A5F';
const LIKE_GREEN = '#4CAF50';

const Card = ({ user }: { user: typeof dummyUsers[0] }) => {
  const [currentStep, setCurrentStep] = useState(0); 
  const totalSteps = user.photos.length + 1;

  const handleTap = (event: GestureResponderEvent) => {
    const x = event.nativeEvent.locationX;
    
    if (x < width / 2) {
      setCurrentStep((prev) => (prev === 0 ? totalSteps - 1 : prev - 1));
    } else {
      setCurrentStep((prev) => (prev === totalSteps - 1 ? 0 : prev + 1));
    }
  };

  return (
    <TouchableOpacity activeOpacity={1} onPress={handleTap} style={styles.card}>
      <View style={styles.progressBarContainer}>
        {Array.from({ length: totalSteps }).map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.progressStep, 
              { backgroundColor: i <= currentStep ? 'white' : 'rgba(255,255,255,0.3)' }
            ]} 
          />
        ))}
      </View>

      {currentStep < user.photos.length ? (
        <View style={{ flex: 1 }}>
          <Image source={{ uri: user.photos[currentStep] }} style={styles.image} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.gradient}>
            <Text style={styles.nameText}>{user.firstName}, {user.age}</Text>
            <View style={styles.uniRow}>
              <Ionicons name="location" size={16} color={BLOOM_COLOR} />
              <Text style={styles.uniText}>{user.universityName}</Text>
            </View>
          </LinearGradient>
        </View>
      ) : (
        <View style={styles.infoContent}>
          <Text style={styles.infoTitle}>Hakkında</Text>
          <Text style={styles.bioText}>{user.bio}</Text>
          
          <Text style={styles.infoTitle}>İlgi Alanları</Text>
          <View style={styles.interestContainer}>
            {user.interests.map((interest, i) => (
              <View key={i} style={styles.interestBadge}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.infoFooter}>
             <Ionicons name="school" size={20} color={BLOOM_COLOR} />
             <Text style={styles.footerText}>{user.department}</Text>
          </View>
          
          <View style={styles.loopHint}>
            <Text style={styles.loopHintText}>Başa dönmek için tıkla</Text>
            <Ionicons name="refresh" size={12} color="#666" />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.headerWrapper}>
        <Header />
      </View>

      <View style={styles.swiperArea}>
        <Swiper
          cards={dummyUsers}
          renderCard={(user) => <Card user={user} />}
          onSwipedLeft={() => console.log('Nope')}
          onSwipedRight={() => console.log('Like')}
          backgroundColor={'transparent'}
          stackSize={3}
          cardVerticalMargin={20}
          verticalSwipe={false}
          
          overlayLabels={{
            left: {
              title: '✕',
              style: {
                label: {
                  backgroundColor: 'rgba(229, 86, 109, 0.9)',
                  borderColor: '#E5566D',
                  color: 'white',
                  borderWidth: 4,
                  fontSize: 60,
                  fontWeight: '800',
                  paddingHorizontal: 20,
                  borderRadius: 50,
                  textAlign: 'center',
                  overflow: 'hidden',
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  marginTop: 40,
                  marginLeft: -30,
                }
              }
            },
            right: {
              title: '✔',
              style: {
                label: {
                  backgroundColor: 'rgba(76, 175, 80, 0.9)',
                  borderColor: LIKE_GREEN,
                  color: 'white',
                  borderWidth: 4,
                  fontSize: 60,
                  fontWeight: '800',
                  paddingHorizontal: 20,
                  borderRadius: 50,
                  textAlign: 'center',
                  overflow: 'hidden',
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  marginTop: 40,
                  marginLeft: 30,
                }
              }
            }
          }}
        />
      </View>
      
      <View style={styles.bottomButtons}>
        <TouchableOpacity style={[styles.button, { borderColor: '#E5566D' }]}>
           <Ionicons name="close" size={35} color="#E5566D" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, { borderColor: LIKE_GREEN }]}>
           <Ionicons name="checkmark" size={35} color={LIKE_GREEN} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  headerWrapper: {
    backgroundColor: '#0a0a0a',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
    zIndex: 100,
  },
  swiperArea: {
    flex: 1,
    marginTop: 0,
  },
  card: {
    height: height * 0.63,
    borderRadius: 30,
    backgroundColor: '#121212',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222',
  },
  progressBarContainer: {
    flexDirection: 'row',
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    zIndex: 10,
    gap: 4
  },
  progressStep: { flex: 1, height: 3, borderRadius: 2 },
  image: { width: '100%', height: '100%', position: 'absolute' },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180, justifyContent: 'flex-end', padding: 24 },
  nameText: { color: 'white', fontSize: 34, fontWeight: '900', letterSpacing: -0.5 },
  uniRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  uniText: { color: 'white', fontSize: 17, fontWeight: '500', opacity: 0.9 },
  infoContent: { flex: 1, padding: 25, paddingTop: 50 },
  infoTitle: { color: BLOOM_COLOR, fontSize: 13, fontWeight: '800', textTransform: 'uppercase', marginBottom: 12, marginTop: 20, letterSpacing: 1 },
  bioText: { color: '#FFF', fontSize: 17, lineHeight: 26, fontWeight: '400' },
  interestContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  interestBadge: { backgroundColor: '#252525', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: '#333' },
  interestText: { color: 'white', fontSize: 14, fontWeight: '500' },
  infoFooter: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1A1A1A', padding: 15, borderRadius: 15 },
  footerText: { color: '#AAA', fontSize: 15, fontWeight: '500' },
  loopHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10, opacity: 0.5 },
  loopHintText: { color: '#666', fontSize: 10, fontWeight: '600' },
  
  // Alt Butonlar
  bottomButtons: { flexDirection: 'row', justifyContent: 'center', gap: 35, position: 'absolute', bottom: 35, width: '100%' },
  button: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)' }
});