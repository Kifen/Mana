import { Contract, BigNumber } from 'ethers'
import ManaABI from './abis/Mana.json'
import ManaPoolABI from './abis/ManaPool.json'
import {
  MANA_POOL_ADDRESS,
  xMANA_ADDRESS,
  MANA_ADDRESS,
  FLEXIBLE_POOL,
  LOCKED_POOL,
} from './constants'
import { User } from './types'

const options = { gasLimit: 286750 }
let decimals = BigNumber.from(18)
decimals = BigNumber.from(10).pow(decimals)

export const getNetwork = (chainId?: number): string => {
  let network: string

  switch (chainId) {
    case 56:
      network = 'Mainnet'
      break
    case 97:
      network = 'Testnet'
      break
    default:
      network = ''
  }

  return network
}

export const ManaPoolContract = (user: User): Contract => {
  const network: any = getNetwork(user.chainId)
  const contract = new Contract(
    MANA_POOL_ADDRESS[network],
    ManaPoolABI,
    user.library?.getSigner(),
  )

  return contract
}

export const ManaContract = (user: User): Contract => {
  const network: any = getNetwork(user.chainId)
  const contract = new Contract(
    MANA_ADDRESS[network],
    ManaABI,
    user.library?.getSigner(),
  )

  return contract
}

export const xManaContract = (user: User): Contract => {
  const network: any = getNetwork(user.chainId)
  const contract = new Contract(
    xMANA_ADDRESS[network],
    ManaABI,
    user.library?.getSigner(),
  )

  return contract
}

export const getManaEarned = async (user: User): Promise<BigNumber> => {
  const contract = ManaPoolContract(user)
  const rewards = await contract.rewardsEarned(user.account)
  return rewards
}

export const getFlexiblePoolBalance = async (
  user: User,
): Promise<BigNumber> => {
  const contract = ManaPoolContract(user)
  const stakeInfo = await contract.flexiblePool(user.account)
  return stakeInfo.xManaTokens
}

export const getLockedPoolBalance = async (user: User): Promise<BigNumber> => {
  const contract = ManaPoolContract(user)
  const stakeInfo = await contract.lockedPool(user.account)
  return stakeInfo.xManaTokens
}

export const getMANABalance = async (user: User): Promise<BigNumber> => {
  const contract = ManaContract(user)
  const balance = await contract.balanceOf(user.account)
  return balance
}

export const getxManaBalance = async (user: User): Promise<BigNumber> => {
  const contract = xManaContract(user)
  const balance = await contract.balanceOf(user.account)
  return balance
}

export const userCanUnstakeInLockedPool = async (
  user: User,
  unstakeAmount: BigNumber,
  setMessage: (arg0: string) => void,
): Promise<boolean> => {
  const manaPool = ManaPoolContract(user)
  let unstake = await canUnstake(user, unstakeAmount, setMessage)

  if (unstake) {
    unstake = await manaPool.canUnstake()
    if (!unstake) {
      const [stakeInfo, lockTime] = await Promise.all([
        manaPool.lockedPool(user.account),
        manaPool.lockTime(),
      ])

      setMessage(`Not time to harvest`)
      return false
    }
  }

  return true
}

export const userCanUnstakeInFlexiblePool = async (
  user: User,
  unstakeAmount: BigNumber,
  setMessage: (arg0: string) => void,
): Promise<boolean> => {
  return await canUnstake(user, unstakeAmount, setMessage)
}

const canUnstake = async (
  user: User,
  unstakeAmount: BigNumber,
  setMessage: (arg0: string) => void,
): Promise<boolean> => {
  const xMana = xManaContract(user)
  const network: any = getNetwork(user.chainId)
  const allowance = await xMana.allowance(
    user.account,
    MANA_POOL_ADDRESS[network],
  )

  if (allowance.lt(unstakeAmount)) {
    setMessage(`Insufficient xMana allowance`)
    return false
  }

  const xManaBalance = await getxManaBalance(user)

  if (xManaBalance.lt(unstakeAmount)) {
    setMessage(`Your xMana balance is insufficient to unstake.`)
    return false
  }

  return true
}

export const initiateUnstake = async (
  user: User,
  amount: BigNumber,
  pool: string,
  setMessage: (arg0: string) => void,
) => {
  let hash
  let canUnstake
  switch (pool) {
    case LOCKED_POOL:
      canUnstake = await userCanUnstakeInLockedPool(user, amount, setMessage)

      if (!canUnstake) return
      hash = await lockedUnstake(user, amount)
      break
    case FLEXIBLE_POOL:
      canUnstake = userCanUnstakeInFlexiblePool(user, amount, setMessage)

      if (!canUnstake) return
      hash = await flexibleUnstake(user, amount)
      break
  }

  return hash
}

const lockedUnstake = async (
  user: User,
  amount: BigNumber,
): Promise<string> => {
  const contract = ManaPoolContract(user)
  const tx = await contract.unstakeLockedPool(amount)
  return tx.hash
}

const flexibleUnstake = async (
  user: User,
  amount: BigNumber,
): Promise<string> => {
  const contract = ManaPoolContract(user)
  const tx = await contract.unstakeFlexiblePool(amount)
  return tx.hash
}

const flexibleStake = async (
  user: User,
  amount: BigNumber,
): Promise<string> => {
  const contract = ManaPoolContract(user)
  const tx = await contract.stakeInFlexiblePool(amount)
  return tx.hash
}

const lockedStake = async (user: User, amount: BigNumber): Promise<string> => {
  const contract = ManaPoolContract(user)
  const tx = await contract.stakeInLockedPool(amount)
  return tx.hash
}

export const initateStake = async (
  user: User,
  amount: BigNumber,
  pool: string,
  setMessage: (arg0: string) => void,
) => {
  const allowance = await manaAllowance(user)
  console.log(
    'allowance: ',
    allowance.toString(),
    allowance.lt(amount),
    amount.toString(),
  )
  if (allowance.lt(amount)) {
    setMessage('Insufficient MANA allowance')
    return false
  }

  const balance = await getMANABalance(user)
  if (balance.lt(amount)) {
    setMessage('Insufficient MANA balance')
    return false
  }

  let hash
  switch (pool) {
    case FLEXIBLE_POOL:
      hash = await flexibleStake(user, amount)
      break
    case LOCKED_POOL:
      hash = await lockedStake(user, amount)
      break
  }
  return hash
}

export const approvexMana = async (user: User, amount: BigNumber) => {
  const xMana = xManaContract(user)
  const txHash = await approve(user, amount, xMana)
  return txHash
}

export const approveMana = async (user: User, amount: BigNumber) => {
  const mana = ManaContract(user)
  const txHash = await approve(user, amount, mana)
  return txHash
}

const approve = async (user: User, amount: BigNumber, contract: Contract) => {
  const network: any = getNetwork(user.chainId)
  const tx = await contract.approve(MANA_POOL_ADDRESS[network], amount, options)
  return tx.hash
}

const xManaAllowance = async (user: User): Promise<BigNumber> => {
  const xMana = xManaContract(user)
  return await allowance(user, xMana)
}

const manaAllowance = async (user: User): Promise<BigNumber> => {
  const mana = ManaContract(user)
  return await allowance(user, mana)
}

const allowance = async (
  user: User,
  contract: Contract,
): Promise<BigNumber> => {
  const network: any = getNetwork(user.chainId)
  const value = await contract.allowance(
    user.account,
    MANA_POOL_ADDRESS[network],
  )
  return value
}
