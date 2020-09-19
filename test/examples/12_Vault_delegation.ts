const Vault = artifacts.require('Vault')
const MintableERC20 = artifacts.require('MintableERC20')

// @ts-ignore
import { expectRevert } from '@openzeppelin/test-helpers'
import { id } from 'ethers/lib/utils'
import { assert } from 'chai'

contract('Delegable', async (accounts: string[]) => {
  let [holder, user1, user2] = accounts

  let vault: any
  let collateral: any
  const postSignature = id('post(address,address,uint256)').slice(0, 10)
  const withdrawSignature = id('withdraw(address,address,uint256)').slice(0, 10)
  const mintSignature = id('mint(address,address,uint256)').slice(0, 10)
  const burnSignature = id('burn(address,address,uint256)').slice(0, 10)

  beforeEach(async () => {
    collateral = await MintableERC20.new('Collateral', 'CLT', { from: holder })
    vault = await Vault.new(collateral.address, 'Vault', 'VLT', { from: holder })
    await collateral.mint(user1, 1000000, { from: holder })
  })

  it('allows posting collateral as delegate', async () => {
    await collateral.approve(vault.address, 1000, { from: user1 })
    await vault.addDelegate(user2, postSignature, 2000000000, { from: user1 })
    await vault.post(user1, user2, 1000, { from: user2 })
    assert.equal(await vault.posted(user2), 1000)
    assert.equal(await collateral.balanceOf(user1), 999000)
  })

  it('sanity check', async () => {
    await collateral.approve(vault.address, 1000, { from: user1 })
    await expectRevert(
      vault.post(user1, user2, 1000, { from: user2 }),
      'Vault: post-access'
    )
  })

  describe('with posted collateral', async () => {
    beforeEach(async () => {
      await collateral.approve(vault.address, 1000, { from: user1 })
      await vault.post(user1, user1, 1000, { from: user1 })
    })

    it('allows withdrawing collateral as delegate', async () => {
      await vault.addDelegate(user2, withdrawSignature, 2000000000, { from: user1 })
      await vault.withdraw(user1, user2, 1000, { from: user2 })
      assert.equal(await vault.posted(user1), 0)
      assert.equal((await collateral.balanceOf(user2)).toString(), 1000)
    })

    it('sanity check', async () => {
      await expectRevert(
        vault.withdraw(user1, user2, 1000, { from: user2 }),
        'Vault: withdraw-access'
      )
    })

    it('allows minting as delegate', async () => {
      await vault.addDelegate(user2, mintSignature, 2000000000, { from: user1 })
      await vault.mint(user1, user2, 1000, { from: user2 })
      assert.equal(await vault.minted(user1), 1000)
      assert.equal(await vault.balanceOf(user2), 1000)
    })

    it('sanity check', async () => {
      await expectRevert(
        vault.mint(user1, user2, 1000, { from: user2 }),
        'Vault: mint-access'
      )
    })

    describe('with minted tokens', async () => {
      beforeEach(async () => {
        await vault.mint(user1, user2, 1000, { from: user1 })
      })

      it('allows burning as delegate', async () => {
        await vault.addDelegate(user1, burnSignature, 2000000000, { from: user2 })
        await vault.approve(vault.address, 1000, { from: user1 })
        await vault.burn(user2, user1, 1000, { from: user1 })
        assert.equal(await vault.minted(user1), 0)
        assert.equal(await vault.balanceOf(user1), 0)
      })

      it('sanity check', async () => {
        await vault.approve(vault.address, 1000, { from: user1 })
        await expectRevert(
          vault.burn(user2, user1, 1000, { from: user1 }),
          'Vault: burn-access'
        )
      })
    })  
  })
})
