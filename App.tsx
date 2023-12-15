/* eslint-disable react-native/no-inline-styles */
/* eslint-disable no-catch-shadow */
import React, {useEffect, useRef, useState} from 'react';
import {
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
// @ts-ignore
import {DEFAULT_PNUMBER, DEFAULT_DOB, DEFAULT_DOE} from '@env';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';

import {
  scanPassport,
  NFCPassportModel,
} from '@better-network/react-native-nfc-passport-reader';
// @ts-ignore
import PassportReader from './android/react-native-passport-reader';
import {PassportData} from './types';
import {
  bytesToBigDecimal,
  bytesToHex,
  dataHashesObjToArray,
  formatAndConcatenateDataHashes,
  formatMrz,
  hash,
  splitToWords,
  toUnsignedByte,
} from './utils';
import {recognizeImage} from './ocr';
import {getMRZCountryCode, includesMRZCountryCode} from './utils/country-code';

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
  const device = useCameraDevice('back');
  const camera = useRef<Camera>();
  const {hasPermission, requestPermission} = useCameraPermission();
  const [readingMRZ, setReadingMRZ] = useState(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, []);

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
        dscSignature: JSON.parse(res.dscSignature),
        dscSignatureAlgorithm: res.dscSignatureAlgorithm,
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
      console.log(bytesToHex(formattedResult.dscSignature, true));
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

  const onReadingMRZ = async () => {
    if (!camera.current) {
      return;
    }
    try {
      let mrz = '';
      let _documentNumber = '';
      let _dateOfBirth = '';
      let _dateOfExpiry = '';
      let isReading = true;
      setReadingMRZ(isReading);
      while (
        (!mrz || !_documentNumber || !_dateOfBirth || !_dateOfExpiry) &&
        isReading
      ) {
        const photo = await camera.current.takePhoto({
          enableShutterSound: false,
          qualityPrioritization: 'quality',
        });
        const {blocks} = await recognizeImage(`file://${photo.path}`);
        for (const block of blocks) {
          if (
            (block.text.startsWith('P<') || block.text.startsWith('I<')) &&
            block.text.includes('\n')
          ) {
            mrz = (block.text as string).replaceAll(' ', '');
            const indexOfLineBreak = mrz.indexOf('\n');
            _documentNumber = mrz.slice(
              indexOfLineBreak,
              indexOfLineBreak + 10,
            );
            _dateOfBirth = mrz.slice(
              indexOfLineBreak + 14,
              indexOfLineBreak + 20,
            );
            _dateOfExpiry = mrz.slice(
              indexOfLineBreak + 22,
              indexOfLineBreak + 28,
            );
            break;
          }
        }
        if (mrz && _documentNumber && _dateOfBirth && _dateOfExpiry) {
          isReading = false;
          setReadingMRZ(false);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      setPassportMRZ({
        documentNumber: _documentNumber,
        dateOfBirth: _dateOfBirth,
        dateOfExpiry: _dateOfExpiry,
      });
    } catch (err: any) {
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={{}}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={{
          height: '100%',
        }}>
        <View
          style={{
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            gap: 20,
            paddingVertical: 50,
            paddingHorizontal: 20,
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
          {hasPermission && device && !scanning && (
            <Camera
              ref={camera as any}
              style={{
                width: '100%',
                height: 100,
              }}
              device={device}
              isActive={true}
              photo={true}
            />
          )}
          {!scanning && !readingMRZ && (
            <TouchableOpacity
              style={{
                backgroundColor: '#ccc',
                padding: 20,
                borderRadius: 10,
              }}
              onPress={onReadingMRZ}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: 'black',
                }}>
                Scan MRZ
              </Text>
            </TouchableOpacity>
          )}
          {!scanning && readingMRZ && (
            <TouchableOpacity
              style={{
                backgroundColor: '#ccc',
                padding: 20,
                borderRadius: 10,
              }}
              onPress={() => {
                setReadingMRZ(false);
              }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: 'black',
                }}>
                Cancel scan
              </Text>
            </TouchableOpacity>
          )}
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
                  width: '80%',
                  height: passportData.photo.height,
                }}
                resizeMode="contain"
              />
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: 'white',
                }}>
                Passport read with success!
              </Text>
            </>
          )}
          {scanning && <Text>Scanning...</Text>}
          {generatingProof && <Text>Proving...</Text>}
        </View>
      </ScrollView>
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
