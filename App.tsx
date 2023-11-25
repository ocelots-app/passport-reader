import React from 'react';
import {
  Button,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import {
  scanPassport,
  NFCPassportModel,
} from '@better-network/react-native-nfc-passport-reader';

function getDataFromPassport() {
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
}

function App(): JSX.Element {
  return (
    <SafeAreaView style={{}}>
      <StatusBar barStyle="dark-content" backgroundColor="white" />
      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{}}>
        <View>
          <Button title="Read Passport" onPress={getDataFromPassport} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({});

export default App;
