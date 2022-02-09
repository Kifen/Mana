//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./lib/IterableMapping.sol";
import "./Mana.sol";

import "hardhat/console.sol";

contract ManaPool is Ownable{
  using IterableMapping for IterableMapping.Map;

  uint256 public lockTime;
  uint256 public fee;
  IERC20 public mana;
  Mana public xMana;
  uint256 public availableRewards;

  enum PoolType{ FLEXIBLE, LOCKED }

  struct StakeInfo {
    uint256 amount;
    uint256 stakedTime;
    bool staked;
    }

    /// @dev Iterable Mapping for staking information
    IterableMapping.Map private stakeInfos;
    mapping(address => StakeInfo) private flexiblePool;
    mapping(address => StakeInfo) private lockedPool;

    event FlexibleStake(uint256 indexed stakeAmount, address indexed staker);

  modifier checkAllowance(uint256 _stakeAmount) {
    require(mana.allowance(msg.sender, address(this)) >= _stakeAmount, "ManaPool: insufficinet allowance");
    _;
  }

  constructor(IERC20 _mana, Mana _xMana, uint256 _lockTime, uint256 _fee) {
    lockTime = _lockTime;
    fee = _fee;
    mana = _mana;
    xMana = _xMana;
  }

  function stakeInFlexiblePool(uint256 _stakeAmount) external checkAllowance(_stakeAmount) {
    address staker = msg.sender;
    _stake(_stakeAmount, staker, PoolType.FLEXIBLE);

    uint256 totalShares = xMana.totalSupply();
    uint256 totalMana = mana.balanceOf(address(this));

    if (totalShares == 0 || totalMana == 0) {
      xMana.mint(staker, _stakeAmount);
    } else {
      uint256 xAmount = _stakeAmount*(totalShares / totalMana);
      xMana.mint(staker, xAmount);
    }
  }

  function stakeInLockedPool(uint256 _stakeAmount) external checkAllowance(_stakeAmount) {
    address staker = msg.sender;
    _stake(_stakeAmount, staker, PoolType.LOCKED);
  }

  function _stake(uint256 _stakeAmount, address _staker, PoolType _poolType) internal {
    StakeInfo memory _stakeInfo = StakeInfo(_stakeAmount, _getNow(), true);

    if (_poolType == PoolType.FLEXIBLE) {
      flexiblePool[_staker] = _stakeInfo;
    } else {
      lockedPool[_staker] = _stakeInfo;
    }

     // Lock the Mana in the contract
    mana.transferFrom(_staker, address(this), _stakeAmount);
  }

  function _getNow() internal view virtual returns (uint256) {
      return block.timestamp;
  }
}