/* eslint-disable no-catch-shadow */
import React, {useState} from 'react';
import {
  Button,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
// @ts-ignore
import {DEFAULT_PNUMBER, DEFAULT_DOB, DEFAULT_DOE} from '@env';

import {
  scanPassport,
  NFCPassportModel,
} from '@better-network/react-native-nfc-passport-reader';
// @ts-ignore
import PassportReader from './android/react-native-passport-reader';

async function getDataFromPassport() {
  try {
    if (Platform.OS === 'ios') {
      scanPassport({
        birthDate: '',
        expiryDate: '',
        passportNumber: '',
        useNewVerificationMethod: true,
      })
        .then((result: NFCPassportModel | {error: string}) => {
          if ('error' in result) {
            // Errors during scanning session
          }
          console.log(result);
          // Do something with result of type NFCPassportModel
        })
        .catch((err: any) => {
          console.log(err);
        });
    } else if (Platform.OS === 'android') {
      const res = await PassportReader.scan({
        documentNumber: DEFAULT_PNUMBER,
        dateOfBirth: DEFAULT_DOB,
        dateOfExpiry: DEFAULT_DOE,
      });

      return res;
    }
  } catch (error: any) {
    if (error.code !== 'E_SCAN_CANCELED') {
      console.error(error);
      PassportReader.cancel();
      throw error;
    }
  }
}

function App(): JSX.Element {
  const [photo, setPhoto] = useState({
    base64: '',
    width: 0,
    height: 0,
  });
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>();

  const onReadPassport = async () => {
    setScanning(true);
    setError('');
    try {
      const {photo} = await getDataFromPassport();
      setPhoto(photo);
    } catch (error: any) {
      setError(JSON.stringify(error));
    }
    setScanning(false);
  };

  const onCancelScan = () => {
    PassportReader.cancel();
    setScanning(false);
  };

  return (
    <SafeAreaView style={{}}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <View
        style={{
          height: '100%',
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        {!scanning && (
          <TouchableOpacity
            style={{
              backgroundColor: '#ccc',
              padding: 20,
              borderRadius: 10,
            }}
            onPress={onReadPassport}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: 'black',
              }}>
              Read passport
            </Text>
          </TouchableOpacity>
        )}
        {scanning && (
          <TouchableOpacity
            style={{
              backgroundColor: '#ccc',
              padding: 20,
              borderRadius: 10,
            }}
            onPress={onCancelScan}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: 'black',
              }}>
              Stop scan
            </Text>
          </TouchableOpacity>
        )}
        {error && <Text>{error}</Text>}
        {photo && photo.base64 && (
          <Image
            source={{
              uri: photo.base64,
            }}
            style={{
              width: photo.width,
              height: photo.height,
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});

export default App;
