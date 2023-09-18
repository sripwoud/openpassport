import {DataHash, MrzInfo, PassportData} from '../types/passportData';

export function toUnsigned(byte: number) {
  return byte & 0xff;
}

export function arraysAreEqual(array1: number[], array2: number[]) {
  return (
    array1.length === array2.length &&
    array1.every((value, index) => value === array2[index])
  );
}

export function toSigned(byte: number) {
  return byte > 127 ? byte - 256 : byte;
}

export function dataHashesObjToArray(dataHashes: {
  [key: string]: number[];
}): DataHash[] {
  return Object.keys(dataHashes)
    .map(key => {
      const dataHash = dataHashes[key as keyof typeof dataHashes];
      return [Number(key), dataHash];
    })
    .sort((a, b) => (a[0] as number) - (b[0] as number)) as DataHash[];
}

export function assembleMrz(mrzInfo: MrzInfo) {
  return (
    mrzInfo.documentCode +
    '<' +
    mrzInfo.issuingState +
    mrzInfo.primaryIdentifier +
    '<<' +
    mrzInfo.secondaryIdentifier +
    mrzInfo.documentNumber +
    mrzInfo.documentNumberCheckDigit +
    mrzInfo.nationality +
    mrzInfo.dateOfBirth +
    mrzInfo.dateOfBirthCheckDigit +
    mrzInfo.gender.substring(0, 1) +
    mrzInfo.dateOfExpiry +
    mrzInfo.dateOfExpiryCheckDigit +
    mrzInfo.optionalData1 +
    mrzInfo.compositeCheckDigit
  );
}

export function formatMrz(mrz: string) {
  const mrzCharcodes = [...mrz].map(char => char.charCodeAt(0));

  // console.log('mrzCharcodes:', mrzCharcodes);

  mrzCharcodes.unshift(88); // the length of the mrz data
  mrzCharcodes.unshift(95, 31); // the MRZ_INFO_TAG
  mrzCharcodes.unshift(91); // the new length of the whole array
  mrzCharcodes.unshift(97); // the tag for DG1

  // console.log('mrzCharcodes with tags:', mrzCharcodes);

  return mrzCharcodes;
}

// Example: [49, 15, 23, 13, 49, 57, 49, 50, 49, 54, 49, 55, 50, 50, 51, 56, 90]
// Is "191216172238Z" - 16th December 2019, 17:22:38 UTC
export function findTimeOfSignature(eContentDecomposed: any) {
  const timeElement: any = eContentDecomposed.elements.find(
    (element: any) => element.elements[0].identifier === '1.2.840.113549.1.9.5',
  );

  if (!timeElement) {
    throw new Error('No time element found in eContentDecomposed');
  }

  const timeFound = timeElement.elements[1].elements[0].time;

  // Adding the 4 bytes of the ASN.1 tag and length
  // 49 : SET, 15 : LGT, 23 : UTCTIME, 13 : LGT
  timeFound.unshift(...[49, 15, 23, 13]);

  return timeFound;
}

export function parsePubKeyString(pubKeyString: string) {
  const modulusMatch = pubKeyString.match(/modulus: (\w+)/);
  const publicExponentMatch = pubKeyString.match(/public exponent: (\w+)/);

  const modulus = modulusMatch ? modulusMatch[1] : null;
  const exponent = publicExponentMatch ? publicExponentMatch[1] : null;

  // console.log('Modulus:', modulus);
  // console.log('Public Exponent:', exponent);

  if (!modulus || !exponent) {
    throw new Error('Could not parse public key string');
  }

  return {
    modulus,
    exponent,
  };
}

export function formatAndConcatenateDataHashes(
  mrzHash: number[],
  dataHashes: DataHash[],
) {
  // Let's replace the first array with the MRZ hash
  dataHashes.shift();
  dataHashes.unshift([1, mrzHash]);
  // Concaténons les dataHashes :
  const concatenatedDataHashes: number[] = [].concat(
    ...dataHashes.map((dataHash: any) => {
      dataHash[1].unshift(...[48, 37, 2, 1, dataHash[0], 4, 32]);
      return dataHash[1];
    }),
  );

  // Starting sequence. Should be the same for everybody, but not sure
  concatenatedDataHashes.unshift(
    ...[
      48, -126, 1, 37, 2, 1, 0, 48, 11, 6, 9, 96, -122, 72, 1, 101, 3, 4, 2, 1,
      48, -126, 1, 17,
    ],
  );
  return concatenatedDataHashes;
}

export function assembleEContent(
  messageDigest: number[],
  timeOfSignature: number[],
) {
  const constructedEContent = [];

  // Detailed description is in private file r&d.ts for now
  // First, the tag and length, assumed to be always the same
  constructedEContent.push(...[49, 102]);

  // 1.2.840.113549.1.9.3 is RFC_3369_CONTENT_TYPE_OID
  constructedEContent.push(
    ...[48, 21, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 3],
  );
  // 2.23.136.1.1.1 is ldsSecurityObject
  constructedEContent.push(...[49, 8, 6, 6, 103, -127, 8, 1, 1, 1]);

  // 1.2.840.113549.1.9.5 is signing-time
  constructedEContent.push(
    ...[48, 28, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 5],
  );
  // time of the signature
  constructedEContent.push(...timeOfSignature);
  // 1.2.840.113549.1.9.4 is RFC_3369_MESSAGE_DIGEST_OID
  constructedEContent.push(
    ...[48, 47, 6, 9, 42, -122, 72, -122, -9, 13, 1, 9, 4],
  );
  // TAG and length of the message digest
  constructedEContent.push(...[49, 34, 4, 32]);

  constructedEContent.push(...messageDigest);
  return constructedEContent;
}