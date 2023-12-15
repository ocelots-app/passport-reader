export type PassportData = {
  signatureAlgorithm: string;
  tbsCertificate: string;
  dscSignature: number[];
  dscSignatureAlgorithm: string;
  photo: {
    base64: string;
    width: number;
    height: number;
  };
  publicKey: {
    modulus?: string;
    exponent?: string;
  };
  signatureAlgorithm: string;
  mrz: string;
  dataGroupHashes: any;
  eContent: number[];
  encryptedDigest: number[];
};

export type MrzInfo = {
  compositeCheckDigit: string;
  dateOfBirth: string;
  dateOfBirthCheckDigit: string;
  dateOfExpiry: string;
  dateOfExpiryCheckDigit: string;
  documentCode: string;
  documentNumber: string;
  documentNumberCheckDigit: string;
  documentType: number;
  gender: string;
  issuingState: string;
  nationality: string;
  optionalData1: string;
  primaryIdentifier: string;
  secondaryIdentifier: string;
};

export type DataHash = [number, number[]];
