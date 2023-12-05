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
import {PassportData} from './types';
import {
  bytesToBigDecimal,
  dataHashesObjToArray,
  formatAndConcatenateDataHashes,
  formatMrz,
  hash,
  splitToWords,
  toUnsignedByte,
} from './utils';

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
  const [passportMRZ, setPassportMRZ] = useState({
    documentNumber: '',
    dateOfBirth: '',
    dateOfExpiry: '',
  });
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>();
  const [passportData, setPassportData] = useState<PassportData>();
  const [generatingProof, setGeneratingProof] = useState(false);
  const [proof, setProof] = useState<string>();

  const onReadPassport = async () => {
    setScanning(true);
    setError('');
    setPassportData(undefined);
    try {
      const res = await getDataFromPassport({
        documentNumber: passportMRZ.documentNumber || DEFAULT_PNUMBER,
        dateOfBirth: passportMRZ.dateOfBirth || DEFAULT_DOB,
        dateOfExpiry: passportMRZ.dateOfExpiry || DEFAULT_DOE,
      });
      const formattedResult: PassportData = {
        signatureAlgorithm: res.signatureAlgorithm,
        publicKey: {
          modulus: res.modulus,
          exponent: res.exponent,
        },
        tbsCertificate: JSON.parse(res.tbsCertificate),
        mrz: res.mrz.replace(/\n/g, ''),
        dataGroupHashes: dataHashesObjToArray(JSON.parse(res.dataGroupHashes)),
        eContent: JSON.parse(res.eContent),
        encryptedDigest: JSON.parse(res.encryptedDigest),
        photo: res.photo,
      };
      console.log(formattedResult);
      setPassportData(formattedResult);
    } catch (error: any) {
      setError(JSON.stringify(error));
    }
    setScanning(false);
  };

  const onCancelScan = () => {
    PassportReader.cancel();
    setScanning(false);
    setPassportData(undefined);
  };

  const onProve = () => {
    if (!passportData) {
      return;
    }
    const formattedMrz = formatMrz(passportData.mrz);
    const mrzHash = hash(formatMrz(passportData.mrz));
    const concatenatedDataHashes = formatAndConcatenateDataHashes(
      mrzHash,
      passportData.dataGroupHashes,
    );

    const inputs = {
      mrz: Array.from(formattedMrz).map(byte => String(byte)),
      dataHashes: Array.from(concatenatedDataHashes.map(toUnsignedByte)).map(
        byte => String(byte),
      ),
      eContentBytes: Array.from(passportData.eContent.map(toUnsignedByte)).map(
        byte => String(byte),
      ),
      signature: splitToWords(
        BigInt(bytesToBigDecimal(passportData.encryptedDigest)),
        BigInt(64),
        BigInt(32),
      ),
      pubkey: splitToWords(
        BigInt(passportData.publicKey.modulus as string),
        BigInt(64),
        BigInt(32),
      ),
    };
    setGeneratingProof(true);

    const start = Date.now();
    PassportReader.provePassport(inputs, (err: any, res: any) => {
      const end = Date.now();
      setGeneratingProof(false);
      if (err) {
        console.error(err);
        setError('err: ' + err.toString());
        return;
      }
      console.log('res: ' + res);
      console.log('time: ' + (end - start));
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
        {passportData && (
          <TouchableOpacity
            style={{
              backgroundColor: '#ccc',
              padding: 20,
              borderRadius: 10,
            }}
            onPress={onProve}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: 'black',
              }}>
              Prove
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
        {passportData && passportData.photo.base64 && (
          <>
            <Image
              source={{
                uri: passportData.photo.base64,
              }}
              style={{
                width: passportData.photo.width,
                height: passportData.photo.height,
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
        {generatingProof && <Text>Proving...</Text>}
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
