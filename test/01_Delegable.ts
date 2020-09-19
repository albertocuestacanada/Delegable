const Delegable = artifacts.require('Delegable')

// @ts-ignore
import { expectRevert } from '@openzeppelin/test-helpers'
import { id } from 'ethers/lib/utils'
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

  it('does not allow revoking delegations that do not exist', async () => {
    await expectRevert(
      delegable.revokeDelegate(user, mintSignature, { from: holder }),
      'Delegable: not-delegated'
    )
  })

  it('adds delegates', async () => {
    await delegable.addDelegate(user, mintSignature, 1000000, { from: holder })
    assert.equal(await delegable.delegates(holder, user, mintSignature), 1000000)
  })

  describe('with setup delegates', async () => {
    beforeEach(async () => {
      await delegable.addDelegate(user, mintSignature, 1000000, { from: holder })
    })

    it('does not allow adding the same delegation twice', async () => {
      await expectRevert(
        delegable.addDelegate(user, mintSignature, 1000000, { from: holder }),
        'Delegable: already-delegated'
      )
    })

    it('changes delegates', async () => {
      await delegable.addDelegate(user, mintSignature, 1000001, { from: holder })
      assert.equal(await delegable.delegates(holder, user, mintSignature), 1000001)
    })

    it('revokes delegates', async () => {
      await delegable.revokeDelegate(user, mintSignature, { from: holder })
      assert.equal(await delegable.delegates(holder, user, mintSignature), 0)
    })
  })
})
