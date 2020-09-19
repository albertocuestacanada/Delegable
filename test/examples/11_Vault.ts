const Vault = artifacts.require('Vault')
const MintableERC20 = artifacts.require('MintableERC20')

import { assert } from 'chai'

contract('Delegable', async (accounts: string[]) => {
  let [owner, user1] = accounts

  let vault: any
  let collateral: any

  beforeEach(async () => {
    collateral = await MintableERC20.new('Collateral', 'CLT', { from: owner })
    vault = await Vault.new(collateral.address, 'Vault', 'VLT', { from: owner })
    await collateral.mint(user1, 1000000, { from: owner })
  })

  it('allows posting collateral', async () => {
    await collateral.approve(vault.address, 1000, { from: user1 })
    await vault.post(user1, user1, 1000, { from: user1 })
    assert.equal(await vault.posted(user1), 1000)
    assert.equal(await collateral.balanceOf(user1), 999000)
  })

  describe('with posted collateral', async () => {
    beforeEach(async () => {
      await collateral.approve(vault.address, 1000, { from: user1 })
      await vault.post(user1, user1, 1000, { from: user1 })
    })

    it('allows withdrawing collateral', async () => {
      await vault.withdraw(user1, user1, 1000, { from: user1 })
      assert.equal(await vault.posted(user1), 0)
      assert.equal((await collateral.balanceOf(user1)).toString(), 1000000)
    })

    it('allows minting', async () => {
      await vault.mint(user1, user1, 1000, { from: user1 })
      assert.equal(await vault.minted(user1), 1000)
      assert.equal(await vault.balanceOf(user1), 1000)
    })

    describe('with minted tokens', async () => {
      beforeEach(async () => {
        await vault.mint(user1, user1, 1000, { from: user1 })
      })

      it('allows burning', async () => {
        await vault.approve(vault.address, 1000, { from: user1 })
        await vault.burn(user1, user1, 1000, { from: user1 })
        assert.equal(await vault.minted(user1), 0)
        assert.equal(await vault.balanceOf(user1), 0)
      })  
    })  
  })
})
