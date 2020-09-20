import { keccak256, defaultAbiCoder, toUtf8Bytes, solidityPack } from 'ethers/lib/utils'
import { ecsign } from 'ethereumjs-util'

export const delegableName = 'Delegable'

export const DELEGABLE_TYPEHASH = keccak256(
  toUtf8Bytes('Permit(address holder,address delegate,bytes4 signature,uint256 expiry,uint256 count)')
)

export const sign = (digest: any, privateKey: any) => {
  return ecsign(Buffer.from(digest.slice(2), 'hex'), privateKey)
}

// Returns the EIP712 hash which should be signed by the user
// in order to make a call to `permit`
export function getPermitDigest(
  permitTypehash: string,
  name: string,
  address: string,
  chainId: number,
  approve: {
    holder: string,
    delegate: string,
    signature: string,
    expiry: number,
  },
  count: number,
) {
  const DELEGABLE_SEPARATOR = getDomainSeparator(name, address, chainId)
  return keccak256(
    solidityPack(
      ['bytes1', 'bytes1', 'bytes32', 'bytes32'],
      [
        '0x19',
        '0x01',
        DELEGABLE_SEPARATOR,
        keccak256(
          defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'bytes4', 'uint256', 'uint256'],
            [permitTypehash, approve.holder, approve.delegate, approve.signature, approve.expiry, count]
          )
        ),
      ]
    )
  )
}

// Gets the EIP712 domain separator
export function getDomainSeparator(name: string, contractAddress: string, chainId: number) {
  return keccak256(
    defaultAbiCoder.encode(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256(toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)')),
        keccak256(toUtf8Bytes(name)),
        keccak256(toUtf8Bytes('1')),
        chainId,
        contractAddress,
      ]
    )
  )
}