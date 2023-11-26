/* eslint-disable react-native/no-inline-styles */
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
  TextInput,
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

async function getDataFromPassport({
  documentNumber,
  dateOfBirth,
  dateOfExpiry,
}: {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
}) {
  try {
    if (Platform.OS === 'ios') {
      scanPassport({
        birthDate: dateOfBirth,
        expiryDate: dateOfExpiry,
        passportNumber: documentNumber,
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
        documentNumber,
        dateOfBirth,
        dateOfExpiry,
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
  const [passportMRZ, setPassportMRZ] = useState({
    documentNumber: '',
    dateOfBirth: '',
    dateOfExpiry: '',
  });
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>();

  const onReadPassport = async () => {
    setScanning(true);
    setError('');
    setPhoto({
      base64: '',
      width: 0,
      height: 0,
    });
    try {
      const {photo} = await getDataFromPassport({
        documentNumber: passportMRZ.documentNumber || DEFAULT_PNUMBER,
        dateOfBirth: passportMRZ.dateOfBirth || DEFAULT_DOB,
        dateOfExpiry: passportMRZ.dateOfExpiry || DEFAULT_DOE,
      });
      setPhoto(photo);
    } catch (error: any) {
      setError(JSON.stringify(error));
    }
    setScanning(false);
  };

  const onCancelScan = () => {
    PassportReader.cancel();
    setScanning(false);
    setPhoto({
      base64: '',
      width: 0,
      height: 0,
    });
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
          gap: 20,
        }}>
        <TextInput
          style={styles.textInput}
          placeholderTextColor="black"
          placeholder="Document Number"
          value={passportMRZ.documentNumber}
          onChangeText={text => {
            setPassportMRZ(prev => ({...prev, documentNumber: text}));
          }}
        />
        <TextInput
          style={styles.textInput}
          placeholderTextColor="black"
          placeholder="Date of Birth (yyMMdd)"
          value={passportMRZ.dateOfBirth}
          onChangeText={text => {
            setPassportMRZ(prev => ({...prev, dateOfBirth: text}));
          }}
        />
        <TextInput
          style={styles.textInput}
          placeholderTextColor="black"
          placeholder="Date of Expiry (yyMMdd)"
          value={passportMRZ.dateOfExpiry}
          onChangeText={text => {
            setPassportMRZ(prev => ({...prev, dateOfExpiry: text}));
          }}
        />
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
          <>
            <Image
              source={{
                uri: photo.base64,
              }}
              style={{
                width: photo.width,
                height: photo.height,
              }}
            />
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
              }}>
              Passport read with success!
            </Text>
          </>
        )}
        {scanning && <Text>Scanning...</Text>}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  textInput: {
    width: '80%',
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 10,
    padding: 20,
    fontSize: 20,
    backgroundColor: 'white',
    color: 'black',
  },
});

export default App;
