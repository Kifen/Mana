import { expect } from "chai";
import { ethers } from "hardhat";
import { ManaPool, ManaPool__factory, Mana, Mana__factory } from "../typechain";
import { BigNumber, Contract } from "ethers";

describe("ManaPool", function () {
  let admin, alice, bob;
  let mana: Mana;
  let xMana: Mana;
  let manaPool;

  const lockTime = 604800; // 7 days (7 * 24 * 60 * 60)
  const fee = 5; // 5 percent

  beforeEach(async () => {
    [admin, alice, bob] = await ethers.getSigners();
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

    await mint([admin.address, alice.address, bob.address], 1000)

    expect(await balanceOf(admin.address, mana)).to.equal(toBNValue(1000))
    expect(await balanceOf(alice.address, mana)).to.equal(toBNValue(1000))
    expect(await balanceOf(bob.address, mana)).to.equal(toBNValue(1000))
  });

  const mint = async (addresses: string[], amount: number) => {
    for (let i = 0; i < addresses.length; i++) {
      await mana.mint(addresses[i], toBNValue(amount));
    }
  };

  const balanceOf = async (address: string, contract: Contract): Promise<BigNumber> => {
    return await contract.balanceOf(address);
  }

  const toBNValue = (value: number, scale = 18) => {
    let decimals = BigNumber.from(scale);
    decimals = BigNumber.from(10).pow(decimals);

    return BigNumber.from(value).mul(decimals);
  };

  describe("Stake", () => {
    it("stakes in flexible pool", async () => {
      
    });
  });
});
