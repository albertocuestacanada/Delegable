const Delegable = artifacts.require('Delegable')

// @ts-ignore
import { expectRevert } from '@openzeppelin/test-helpers'
import { id } from 'ethers/lib/utils'
import { delegableName, DELEGABLE_TYPEHASH, getPermitDigest, sign } from '../utils/signatures'
import { assert } from 'chai'

contract('Delegable', async (accounts: string[]) => {
  let [holder, user] = accounts

  // this is the first account that buidler creates
  // https://github.com/nomiclabs/buidler/blob/d399a60452f80a6e88d974b2b9205f4894a60d29/packages/buidler-core/src/internal/core/config/default-config.ts#L41
  const holderPrivateKey = Buffer.from('c5e8f61d1ab959b397eecc0a37a6517b8e67a0e7cf1f4bce5591f3ed80199122', 'hex')
  const chainId = 31337 // buidlerevm chain id

  let delegable: any
  const mintSignature = id('mint(address,uint256)').slice(0, 10)

  beforeEach(async () => {
    delegable = await Delegable.new({ from: holder })
  })

  it('adds delegates by permit', async () => {
    // Create the approval request
    const approve = {
      holder: holder,
      delegate: user,
      signature: mintSignature,
      expiry: 100000000000000,
    }

    // Get the user's permit count
    const count = await delegable.count(holder)

    // Get the EIP712 digest
    const digest = getPermitDigest(DELEGABLE_TYPEHASH, delegableName, delegable.address, chainId, approve, count)

    // Sign it
    // NOTE: Using web3.eth.sign will hash the message internally again which
    // we do not want, so we're manually signing here
    const { v, r, s } = sign(digest, holderPrivateKey)
    await delegable.addDelegateByPermit(
      approve.holder,
      approve.delegate,
      approve.signature,
      approve.expiry,
      v, r, s,
      { from: holder }
    )
    assert.equal(await delegable.delegates(holder, user, mintSignature), 100000000000000)
  })

  it('sanity check', async () => {
    // Create the approval request
    const approve = {
      holder: holder,
      delegate: user,
      signature: mintSignature,
      expiry: 100000000000000,
    }

    // Get the user's permit count
    const count = await delegable.count(holder)

    // Get the EIP712 digest
    const digest = getPermitDigest(DELEGABLE_TYPEHASH, delegableName, delegable.address, chainId, approve, count)

    // Sign it
    // NOTE: Using web3.eth.sign will hash the message internally again which
    // we do not want, so we're manually signing here
    const { v, r, s } = sign(digest, holderPrivateKey)
    await expectRevert(
      delegable.addDelegateByPermit(
        approve.holder,
        approve.delegate,
        approve.signature,
        1, // Something different
        v, r, s,
        { from: holder }
      ),
      'Delegable: invalid-signature'
    )
  })
})