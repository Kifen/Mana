import { expect } from "chai";
import { ethers } from "hardhat";
import { ManaPool, ManaPool__factory, Mana, Mana__factory } from "../typechain";
import { BigNumber, Contract, Signer } from "ethers";

describe("ManaPool", function () {
  let admin: Signer
  let alice: Signer
  let bob: Signer;

  let adminAddress: string
  let aliceAddress: string
  let bobAddress: string

  let mana: Mana;
  let xMana: Mana;
  let manaPool: ManaPool;

  const lockTime = 604800; // 7 days (7 * 24 * 60 * 60)
  const fee = 5; // 5 percent

  beforeEach(async () => {
    [admin, alice, bob] = await ethers.getSigners();
    adminAddress = await admin.getAddress();
    aliceAddress = await alice.getAddress();
    bobAddress = await bob.getAddress()

    // Deploy Mana Token
    const ManaFactory = (await ethers.getContractFactory(
      "Mana",
      admin
    )) as Mana__factory;
    mana = await ManaFactory.deploy("Mana", "MANA");
    await mana.deployed();

    // Deploy xMana Token
    const xManaFactory = (await ethers.getContractFactory(
      "Mana",
      admin
    )) as Mana__factory;
    xMana = await xManaFactory.deploy("xMana", "xMANA");
    await xMana.deployed();

    // Deploy staking pool ManaPool
    const ManaPoolFactory = (await ethers.getContractFactory(
      "ManaPool",
      admin
    )) as ManaPool__factory;
    manaPool = await ManaPoolFactory.deploy(
      mana.address,
      xMana.address,
      lockTime,
      fee
    );
    manaPool.deployed();

    await mint([adminAddress, aliceAddress, bobAddress], 1000)
    await xMana._addMinter(manaPool.address); // Set staking pool contract as a minter on xMana 

    expect(await balanceOf(adminAddress, mana)).to.equal(toBNValue(1000))
    expect(await balanceOf(aliceAddress, mana)).to.equal(toBNValue(1000))
    expect(await balanceOf(bobAddress, mana)).to.equal(toBNValue(1000))
    expect(await xMana.isMinter(manaPool.address)).to.equal(true);
  });

  const mint = async (addresses: string[], amount: number) => {
    for (let i = 0; i < addresses.length; i++) {
      await mana.mint(addresses[i], toBNValue(amount));
    }
  };

  const balanceOf = async (address: string, contract: Contract): Promise<BigNumber> => {
    return await contract.balanceOf(address);
  }

  const approve = async (contract: Contract, amount: BigNumber, spender: string, signer: Signer) => {
    await contract.connect(signer).approve(spender, amount);
  }

  const toBNValue = (value: number, scale = 18) => {
    let decimals = BigNumber.from(scale);
    decimals = BigNumber.from(10).pow(decimals);

    return BigNumber.from(value).mul(decimals);
  };

  describe("Stake", () => {
    it("stake in flexible pool", async () => {
      const staker: Signer = alice
      const stakerAddress = aliceAddress
      const stakeAmount = toBNValue(100);
      const stakerInitialBalance = await balanceOf(stakerAddress, mana)

      await approve(mana, stakeAmount, manaPool.address, staker)
      await manaPool.connect(staker).stakeInFlexiblePool(stakeAmount)

      expect(await balanceOf(stakerAddress, xMana)).to.equal(stakeAmount) // Pool is empty so xMana to Mana is 1:1
      expect(await balanceOf(manaPool.address, mana)).to.equal(stakeAmount)
      expect(await balanceOf(stakerAddress, mana)).to.equal(stakerInitialBalance.sub(stakeAmount))
    });
  });
});
