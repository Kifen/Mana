//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

import "./lib/IterableMapping.sol";
import "./ManaERC20.sol";

import "hardhat/console.sol";

contract ManaPool is Ownable{
  using SafeMath for uint256;
  using IterableMapping for IterableMapping.Map;

  uint256 public lockTime;
  uint256 public fee;
  Mana public mana;
  Mana public xMana;
  uint256 public availableRewards;

  enum PoolType{ FLEXIBLE, LOCKED }

  struct StakeInfo {
    uint256 stakedTime;
    bool staked;
    }

    /// @dev Iterable Mapping for staking information
    IterableMapping.Map private stakeInfos;
    mapping(address => StakeInfo) private flexiblePool;
    mapping(address => StakeInfo) private lockedPool;

    event FlexibleStake(uint256 indexed stakeAmount, address indexed staker);

    event LockedStake(uint256 indexed stakeAmount, address indexed staker);

    event NewFee(uint256 indexed oldFee, uint256 indexed newFee);

    event NewLockTime(uint256 indexed oldLockTime, uint256 indexed newLockTime);

  modifier checkAllowance(uint256 _stakeAmount, IERC20 _ierc20) {
    require(_ierc20.allowance(msg.sender, address(this)) >= _stakeAmount, "ManaPool: insufficinet allowance");
    _;
  }

  modifier checkBalance(uint256 _stakeAmount) {
    require(mana.balanceOf(msg.sender) >= _stakeAmount, "ManaPool: insufficinet mana");
    _;
  }

  constructor(Mana _mana, Mana _xMana, uint256 _lockTime, uint256 _fee) {
    lockTime = _lockTime;
    fee = _fee;
    mana = _mana;
    xMana = _xMana;
  }

  function stakeInFlexiblePool(uint256 _stakeAmount) external checkAllowance(_stakeAmount, mana) checkBalance(_stakeAmount){
    _stake(_stakeAmount, msg.sender, PoolType.FLEXIBLE);

    emit FlexibleStake(_stakeAmount, msg.sender);
  }

  function stakeInLockedPool(uint256 _stakeAmount) external checkAllowance(_stakeAmount, mana) checkBalance(_stakeAmount) {
    _stake(_stakeAmount, msg.sender, PoolType.LOCKED);

    emit LockedStake(_stakeAmount, msg.sender);
  }

  function _stake(uint256 _stakeAmount, address _staker, PoolType _poolType) internal {
    StakeInfo memory _stakeInfo = StakeInfo(_getNow(), true);

    if (_poolType == PoolType.FLEXIBLE) {
      flexiblePool[_staker] = _stakeInfo;
    } else {
      lockedPool[_staker] = _stakeInfo;
    }

    uint256 xManaSupply = xMana.totalSupply();
    uint256 totalMana = mana.balanceOf(address(this));

    if (xManaSupply == 0 || totalMana == 0) {
      xMana.mint(_staker, _stakeAmount);
    } else {
      uint256 xAmount = _stakeAmount.mul(xManaSupply).div(totalMana);
      xMana.mint(_staker, xAmount);
    }

     // Lock the Mana in the contract
    mana.transferFrom(_staker, address(this), _stakeAmount);
  }

  function unstakeFlexiblePool(uint256 _amount) external checkAllowance(_amount, xMana){
     StakeInfo memory _stakeInfo = flexiblePool[msg.sender];
    require(_stakeInfo.staked, "ManaPool: no stake");

      _unstake(_amount, msg.sender, _stakeInfo.stakedTime, PoolType.FLEXIBLE);
      delete flexiblePool[msg.sender];
  }

  function unstakeLockedPool(uint256 _amount) external checkAllowance(_amount, xMana){
     StakeInfo memory _stakeInfo = lockedPool[msg.sender];

    require(_stakeInfo.staked, "ManaPool: no stake");
    require(_fullClaim(_stakeInfo.stakedTime), "Mana: not yet time");

    _unstake(_amount, msg.sender, _stakeInfo.stakedTime, PoolType.FLEXIBLE);
    delete lockedPool[msg.sender];
  }

  function _unstake(uint256 _amount, address _account, uint256 _stakedTime, PoolType _poolType) internal {
    require(xMana.balanceOf(msg.sender) >= _amount, "ManaPool: insufficinet xMana");

    uint256 xManaTotalSupply = xMana.totalSupply();
    uint256 totalMana = mana.balanceOf(address(this));
    uint256 reward = calculateReward(_amount, totalMana,xManaTotalSupply); //_amount.mul(totalMana).div(xManaTotalSupply)

    if (PoolType.FLEXIBLE == _poolType && !_fullClaim(_stakedTime)) {
      uint256 fee = reward.mul(fee).div(100);
      reward = reward.sub(fee);
    } 

    xMana.burn(msg.sender, _amount);
    mana.transfer(msg.sender, reward);
  }

  function _getNow() internal view virtual returns (uint256) {
      return block.timestamp;
  }

  function _fullClaim(uint256 _stakeTime) internal returns (bool) {
    if (_stakeTime + lockTime >= _getNow()) return false;

    return true;
  }

  function _setFee(uint256 _newFee) external onlyOwner {
    uint256 oldFee = fee;
    fee = _newFee;

    emit NewFee(oldFee, _newFee);
  }

  function _setLockTime(uint256 _newLockTime) external onlyOwner {
    uint256 oldLockTime = lockTime;
    lockTime = _newLockTime;

    emit NewLockTime(oldLockTime, _newLockTime);
  }

  function calculateReward(uint256 _amount, uint256 _totalMana, uint256 _xManaTotalSupply) public view returns (uint256) {
    return _amount.mul(_totalMana).div(_xManaTotalSupply);
  }
}