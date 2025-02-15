import base58 from 'bs58';
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types';
import { isError } from 'jito-ts/dist/sdk/block-engine/utils';
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { VersionedTransaction, PublicKey, Keypair } from '@solana/web3.js';
import { connection, SOL_DECIMAL } from '../config/config';

/**
 *
 * @param {string} signature
 * @returns
 */
export const onSignatureResult = async (signature: string) => {
  console.log('OnSignature', signature);
  return new Promise((resolve, reject) => {
    let timeout = setTimeout(() => {
      console.log('transaction failed', signature);
      reject(false);
    }, 30000);
    connection.onSignature(
      signature,
      (updatedTxInfo) => {
        console.log('update account info', updatedTxInfo);
        clearTimeout(timeout);
        resolve(true);
      },
      'confirmed'
    );
  });
};

/**
 *
 * @param {string[]} signatures
 * @returns
 */
export const onBundleResultFromConfirmTransaction = async (signatures: string[]) => {
  for (const signature of signatures) {
    try {
      const txResult = await onSignatureResult(signature);
      console.log('txResult', txResult, signature);
      if (txResult == false) return false;
    } catch (err) {
      console.log('transaction confirmation error', err);
      return false;
    }
  }
  return true;
};

/**
 *
 * @param {VersionedTransaction[]} bundledTxns
 * @param {Keypair} keyPair
 * @returns
 */
export async function sendBundle(bundledTxns: VersionedTransaction[], keyPair: Keypair, jitoFee = 0.001) {
  try {
    const blockEngineUrl = 'frankfurt.mainnet.block-engine.jito.wtf';
    const searcher = searcherClient(blockEngineUrl, undefined);
    const bundle = new Bundle(bundledTxns, bundledTxns.length + 1);

    const { blockhash } = await connection.getLatestBlockhash('finalized');

    const result = await searcher.getTipAccounts();
    if (result.ok === false) {
      throw new Error('Did not get the tip account.');
    }
    const tipAccount = new PublicKey(result.value[0]);

    let maybeBundle = bundle.addTipTx(keyPair, jitoFee * SOL_DECIMAL, tipAccount, blockhash);

    if (isError(maybeBundle)) {
      throw maybeBundle;
    }

    const signatures = bundledTxns.map((element) => {
      return base58.encode(element.signatures[0]);
    });
    console.log('bundle signatures', signatures);

    const bundleId = await searcher.sendBundle(maybeBundle);
    if (bundleId.ok === false) {
      throw new Error('Sending bundle failed.');
    }
    console.log(`Bundle ${bundleId.value} sent.`);

    const res = await onBundleResultFromConfirmTransaction(signatures);
    return { success: res, signature: signatures[0] };
  } catch (error: any) {
    console.error('Error sending bundle:', error);
    throw new Error(error.message || 'Unexpected error while bundling.');
  }
}
