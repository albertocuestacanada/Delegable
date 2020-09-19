const Delegable = artifacts.require('Delegable')

// @ts-ignore
import { expectRevert } from '@openzeppelin/test-helpers'
import { defaultAbiCoder, id, keccak256, toUtf8Bytes, solidityPack } from 'ethers/lib/utils'
import { ecsign } from 'ethereumjs-util'
import { assert } from 'chai'

contract('Delegable', async (accounts: string[]) => {
  let [owner, user] = accounts

  // this is the first account that buidler creates
  // https://github.com/nomiclabs/buidler/blob/d399a60452f80a6e88d974b2b9205f4894a60d29/packages/buidler-core/src/internal/core/config/default-config.ts#L41
  const ownerPrivateKey = Buffer.from('c5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122', 'hex')
  const chainId = 31337 // buidlerevm chain id
  const DELEGABLE_TYPEHASH = keccak256(
    toUtf8Bytes('Permit(address owner,address delegate,bytes4 signature,uint256 expiry,uint256 count')
  )
  const name = 'Delegable'

  let delegable: any
  const mintSignature = id('mint(address,uint256)').slice(0, 10)

  beforeEach(async () => {
    delegable = await Delegable.new({ from: owner })
  })

  it('adds delegates by permit', async () => {
    // Create the approval request
    const approve = {
      owner: owner,
      delegate: user,
      signature: mintSignature,
      expiry: 100000000000000,
    }

    // Get the user's permit count
    const count = await delegable.count(owner)

    // Get the EIP712 digest
    const digest = getPermitDigest(DELEGABLE_TYPEHASH, name, delegable.address, chainId, approve, count)

    // Sign it
    // NOTE: Using web3.eth.sign will hash the message internally again which
    // we do not want, so we're manually signing here
    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), ownerPrivateKey)
    await delegable.addDelegateByPermit(
      approve.owner,
      approve.delegate,
      approve.signature,
      approve.expiry,
      v, r, s,
      { from: owner }
    )
    assert.equal(await delegable.delegates(owner, user, mintSignature), 100000000000000)
  })

  it('sanity check', async () => {
    // Create the approval request
    const approve = {
      owner: owner,
      delegate: user,
      signature: mintSignature,
      expiry: 100000000000000,
    }

    // Get the user's permit count
    const count = await delegable.count(owner)

    // Get the EIP712 digest
    const digest = getPermitDigest(DELEGABLE_TYPEHASH, name, delegable.address, chainId, approve, count)

    // Sign it
    // NOTE: Using web3.eth.sign will hash the message internally again which
    // we do not want, so we're manually signing here
    const { v, r, s } = ecsign(Buffer.from(digest.slice(2), 'hex'), ownerPrivateKey)
    await expectRevert(
      delegable.addDelegateByPermit(
        approve.owner,
        approve.delegate,
        approve.signature,
        1, // Something different
        v, r, s,
        { from: owner }
      ),
      'Delegable: invalid-signature'
    )
  })
})

// Returns the EIP712 hash which should be signed by the user
// in order to make a call to `permit`
export function getPermitDigest(
  permitTypehash: string,
  name: string,
  address: string,
  chainId: number,
  approve: {
    owner: string,
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
            [permitTypehash, approve.owner, approve.delegate, approve.signature, approve.expiry, count]
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