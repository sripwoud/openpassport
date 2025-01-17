import { describe } from 'mocha';
import path from 'path';
import { poseidon6 } from 'poseidon-lite';
import { mockPassportData_sha1_ecdsa } from '../../../common/src/constants/mockPassportData';
import { generateCircuitInputsRegister } from '../../../common/src/utils/generateInputs';
import { BigintToArray, hexToDecimal, packBytes } from '../../../common/src/utils/utils';
import { expect } from 'chai';
import { getLeaf } from '../../../common/src/utils/pubkeyTree';
import { wasm as wasm_tester } from 'circom_tester';
import { PASSPORT_ATTESTATION_ID } from '../../../common/src/constants/constants';

describe('Register - SHA1 WITH ECDSA', function () {
  this.timeout(0);
  let circuit: any;

  const passportData = mockPassportData_sha1_ecdsa;
  const n_dsc = 43; // 43 * 6 = 258 > 254 Cirom field size
  const k_dsc = 6;
  const secret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();
  const dscSecret = BigInt(Math.floor(Math.random() * Math.pow(2, 254))).toString();

  const inputs = generateCircuitInputsRegister(
    secret,
    dscSecret,
    PASSPORT_ATTESTATION_ID,
    passportData,
    n_dsc,
    k_dsc
  );

  before(async () => {
    circuit = await wasm_tester(
      path.join(__dirname, '../../circuits/register/register_ecdsa_sha1.circom'),
      {
        include: [
          'node_modules',
          './node_modules/@zk-kit/binary-merkle-root.circom/src',
          './node_modules/circomlib/circuits',
          './node_modules/dmpierre/sha1-circom/circuits',
        ],
      }
    );
  });

  it('should compile and load the circuit', async function () {
    expect(circuit).to.not.be.undefined;
  });

  it('should calculate the witness with correct inputs', async function () {
    const w = await circuit.calculateWitness(inputs);
    await circuit.checkConstraints(w);

    const nullifier = (await circuit.getOutput(w, ['nullifier'])).nullifier;
    console.log('\x1b[34m%s\x1b[0m', 'nullifier', nullifier);
    const commitment_circom = (await circuit.getOutput(w, ['commitment'])).commitment;
    console.log('\x1b[34m%s\x1b[0m', 'commitment', commitment_circom);
    const blinded_dsc_commitment = (await circuit.getOutput(w, ['blinded_dsc_commitment']))
      .blinded_dsc_commitment;
    console.log('\x1b[34m%s\x1b[0m', 'blinded_dsc_commitment', blinded_dsc_commitment);

    const mrz_bytes = packBytes(inputs.mrz);
    const leaf = getLeaf({
      signatureAlgorithm: passportData.signatureAlgorithm,
      publicKeyQ: passportData.pubKey.publicKeyQ,
    }).toString();

    const commitment_bytes = poseidon6([
      inputs.secret[0],
      PASSPORT_ATTESTATION_ID,
      leaf,
      mrz_bytes[0],
      mrz_bytes[1],
      mrz_bytes[2],
    ]);
    const commitment_js = commitment_bytes.toString();
    expect(commitment_circom).to.be.equal(commitment_js);
  });

  it('should fail to calculate witness with invalid dataHashes', async function () {
    try {
      const invalidInputs = {
        ...inputs,
        dataHashes: inputs.dataHashes.map((byte: string) => String((parseInt(byte, 10) + 1) % 256)),
      };
      await circuit.calculateWitness(invalidInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  it('should fail to calculate witness with invalid mrz', async function () {
    try {
      const invalidInputs = {
        ...inputs,
        mrz: Array(93)
          .fill(0)
          .map((byte) => BigInt(byte).toString()),
      };
      await circuit.calculateWitness(invalidInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });

  it('should fail to calculate witness with invalid signature', async function () {
    let wrong_signature_s = BigintToArray(43, 6, BigInt(hexToDecimal('10') + 1));
    try {
      const invalidInputs = {
        ...inputs,
        signature: [inputs.signature[0], wrong_signature_s],
      };
      await circuit.calculateWitness(invalidInputs);
      expect.fail('Expected an error but none was thrown.');
    } catch (error) {
      expect(error.message).to.include('Assert Failed');
    }
  });
});
