import React, { useEffect, useState } from 'react'
import { Form, InputGroup, Button } from 'react-bootstrap'
import { BigNumber, utils } from 'ethers'
import { useWeb3React } from '@web3-react/core'
import { MetaMask } from '../../connectors'
import './main.css'
import PendingTxModal from './PendingTxModal'
import Message from '../Message/Message'
import ApproveModal from '../ApproveModal/ApproveModal'
import { User } from '../../services/types'
import {
  getMANABalance,
  getxManaBalance,
  approveMana,
  approvexMana,
  initateStake,
  initiateUnstake,
  getManaEarned,
  getFlexiblePoolBalance,
  getLockedPoolBalance,
} from '../../services/utils'
import { FLEXIBLE_POOL, LOCKED_POOL } from '../../services/constants'

const getUser = (chainId?: number, account?: any, library?: any): User => {
  const user = {
    account,
    chainId,
    library,
  }
  return user
}

const Main = () => {
  const { active, activate, library, account, chainId } = useWeb3React()
  let decimals = BigNumber.from(18)
  decimals = BigNumber.from(10).pow(decimals)

  const [value, setValue] = useState<any | null>(null)
  const [poolType, setPoolType] = useState<any | null>(null)
  const [stake, setStake] = useState<boolean>(true)
  const [unstake, setUnstake] = useState<boolean>(false)
  const [message, setMessage] = useState<string>('')
  const [manaBalance, setManaBalance] = useState<string>('')
  const [xManaBalance, setXmanaBalance] = useState<string>('')
  const [manaEarned, setManaEarned] = useState<string>('')
  const [flexiblePoolBalance, setFlexiblePoolBalance] = useState<string>('')
  const [lockedPoolBalance, setLockedPoolBalance] = useState<string>('')
  const [show, setShow] = useState<boolean>(false)
  const [txShow, setTxShow] = useState<boolean>(false)
  const [pendingHash, setPendingHash] = useState<string | any>('')

  useEffect(() => {
    async function getBalances() {
      const user = getUser(chainId, account, library)
      const [xMana, mana, earnedMana, flexPool, locPool] = await Promise.all([
        getxManaBalance(user),
        getMANABalance(user),
        getManaEarned(user),
        getFlexiblePoolBalance(user),
        getLockedPoolBalance(user),
      ])

      const xManaBal = Number(utils.formatEther(xMana)).toFixed(2).toString()

      const manaBal = Number(utils.formatEther(mana)).toFixed(2).toString()

      const earnedManaBal = Number(utils.formatEther(earnedMana))
        .toFixed(2)
        .toString()

      const flexPoolBal = Number(utils.formatEther(flexPool))
        .toFixed(2)
        .toString()

      const locPoolBal = Number(utils.formatEther(locPool))
        .toFixed(2)
        .toString()

      setXmanaBalance(xManaBal)
      setManaBalance(manaBal)
      setManaEarned(earnedManaBal)
      setFlexiblePoolBalance(flexPoolBal)
      setLockedPoolBalance(locPoolBal)
    }

    if (active) {
      activate(MetaMask)
      getBalances()
    }
  }, [active, activate, library, account, chainId, decimals])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!value) return
    const pool = poolType == 'locked' ? LOCKED_POOL : FLEXIBLE_POOL

    const amount = BigNumber.from(value).mul(decimals)

    if (stake) {
      const hash = await initateStake(
        getUser(chainId, account, library),
        amount,
        pool,
        setMessage,
      )
      if (hash) {
        setPendingHash(hash)
        setTxShow(true)
      }
    } else {
      const hash = await initiateUnstake(
        getUser(chainId, account, library),
        amount,
        pool,
        setMessage,
      )

      if (hash) {
        setPendingHash(hash)
        setTxShow(true)
      }
    }
  }

  return (
    <div className="main-page">
      <ApproveModal
        user={getUser(chainId, account, library)}
        show={show}
        onHide={() => setShow(false)}
        setShow={setShow}
        setPendingHash={setPendingHash}
        setTxShow={setTxShow}
        approve={stake ? approveMana : approvexMana}
        action={stake ? 'stake' : 'unstake'}
      />
      <PendingTxModal
        show={txShow}
        onHide={() => setTxShow(false)}
        hash={pendingHash}
        setTxShow={setTxShow}
      />
      <div className="main">
        <div className="balance-div mb-4">
          <div className="bln">
            <span className="bal-name">xMana Balance</span>
            <span className="baln">{`${xManaBalance} xMana`}</span>
          </div>
          <div className="bln">
            <span className="bal-name">Mana Balance</span>
            <span className="baln">{`${manaBalance} Mana`}</span>
          </div>
          <div className="bln">
            <span className="bal-name">Earned Mana</span>
            <span className="baln">{`${manaEarned} Mana`}</span>
          </div>
        </div>
        <div className="balance-div mb-4">
          {/* <div className="bln">
            <span className="bal-name">APR</span>
            <span className="baln">{`${} %`}</span>
          </div> */}
          <div className="bln">
            <span className="bal-name">Staked flexible pool balance</span>
            <span className="baln">{`${flexiblePoolBalance} xMana`}</span>
          </div>
          <div className="bln">
            <span className="bal-name">Staked locked pool balance</span>
            <span className="baln">{`${lockedPoolBalance} xMana`}</span>
          </div>
        </div>
        {message && (
          <Message variant="danger">
            <span className="text-center">{message}</span>
            <i
              style={{ float: 'right', cursor: 'pointer', marginTop: '5px' }}
              className="far fa-times-circle"
              onClick={() => setMessage('')}
              onKeyDown={() => setMessage('')}
              aria-hidden="true"
            />
          </Message>
        )}
        <div className="access-box">
          <div className="buy-sell mb-2">
            <Button
              onClick={() => {
                setStake((prev) => !prev)
                setUnstake((prev) => !prev)
              }}
              variant="outline"
              className={`Stake ${stake && `borderr`}`}
            >
              Stake
            </Button>
            <Button
              onClick={() => {
                setUnstake((prev) => !prev)
                setStake((prev) => !prev)
              }}
              variant="outline"
              className={`unstake ${unstake && `borderr`}`}
            >
              Unstake
            </Button>
          </div>
          <div className="top">
            <span>Input</span>
          </div>
          <div className="form">
            <Form onSubmit={handleSubmit}>
              <InputGroup>
                <Form.Control
                  type="number"
                  min="0"
                  required
                  placeholder="0"
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value, 10))}
                />
                <InputGroup.Append>
                  {stake ? (
                    <InputGroup.Text>MANA</InputGroup.Text>
                  ) : (
                    <InputGroup.Text>xMANA</InputGroup.Text>
                  )}
                </InputGroup.Append>
              </InputGroup>
              <div>
                <select onChange={(e) => setPoolType(e.target.value)} required>
                  <option value="">Select a pool</option>
                  <option value="flexible">flexible</option>
                  <option value="locked">locked</option>
                </select>
              </div>
              {/* {value && (
                <div className="info-span">
                  <span className="text-muted">
                    {value} TOK = {buyPrice} DAI
                  </span>
                </div>
              )} */}
              <div className="button">
                <Button type="submit" variant="dark" className="submit-btn">
                  {stake ? 'Stake' : 'Unstake'}
                </Button>
              </div>
            </Form>
          </div>
        </div>
        <div className="approve-text">
          <span
            onClick={() => setShow(true)}
            onKeyDown={() => setShow(true)}
            aria-hidden="true"
          >
            <b>Set Approvals</b>
          </span>
        </div>
      </div>
    </div>
  )
}

export default Main
