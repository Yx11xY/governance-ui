import { ApiPromise, SubmittableResult } from '@polkadot/api';
import {
  ApiOptions,
  Signer,
  SubmittableExtrinsic,
  SubmittableExtrinsics,
} from '@polkadot/api/types';
import { IMethod } from '@polkadot/types-codec/types/interfaces';
import {
  BN_HUNDRED,
  formatBalance as formatBalanceP,
  hexToU8a,
  isHex,
} from '@polkadot/util';
import { decodeAddress, encodeAddress } from '@polkadot/keyring';
import BN from 'bn.js';

const DEFAULT_OPTIONS = {
  noInitWarn: true,
  throwOnConnect: false,
};

export function newApi(options?: ApiOptions): Promise<ApiPromise> {
  return ApiPromise.create({
    ...DEFAULT_OPTIONS,
    ...options,
  });
}

export function batchAll(
  api: { tx: SubmittableExtrinsics<'promise'> },
  calls: IMethod[]
): SubmittableExtrinsic<'promise', SubmittableResult> {
  return api.tx.utility.batchAll([...calls]);
}

export async function signAndSend(
  address: string,
  signer: Signer,
  extrinsic: SubmittableExtrinsic<'promise', SubmittableResult>,
  callback: ((result: SubmittableResult) => void) | undefined = undefined
): Promise<() => void> {
  const unsub = await extrinsic.signAndSend(
    address,
    { signer },
    (callResult) => {
      const { status } = callResult;
      if (status.isFinalized || status.isInvalid) {
        unsub();
      }
      callback?.(callResult);
    }
  );
  return unsub;
}

export async function calcEstimatedFee(
  tx: SubmittableExtrinsic<'promise', SubmittableResult>,
  sender: string
): Promise<BN> {
  const { partialFee } = await tx.paymentInfo(sender);
  // 'partialFee' is the total fee minus eventual tip
  // Use some margin to be extra safe (strategy copied from https://github.com/polkadot-js/apps/blob/master/packages/page-accounts/src/modals/Transfer.tsx#L65)
  // Also see https://polkadot.js.org/docs/api/start/api.tx.subs/#payment-information
  // and https://wiki.polkadot.network/docs/build-node-interaction#fetching-a-block
  return partialFee.muln(110).div(BN_HUNDRED);
}

export function formatBalance(
  input: BN,
  decimals: number,
  unit: string
): string {
  return formatBalanceP(input, { decimals, withUnit: unit });
}

export function isValidAddress(address: string): boolean {
  try {
    encodeAddress(isHex(address) ? hexToU8a(address) : decodeAddress(address));

    return true;
  } catch (error) {
    return false;
  }
}
