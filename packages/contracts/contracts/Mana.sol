//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "hardhat/console.sol";

contract Mana is ERC20, AccessControl {
  bytes32 public constant MINTER_ROLE = keccak256("MINTER");


  constructor() ERC20("Mana", "MANA") {
    _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _setRoleAdmin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);
  }

  function _addMinter(address _newMinter) external onlyRole(DEFAULT_ADMIN_ROLE)  {
      grantRole(MINTER_ROLE, _newMinter);
  }

  function _removeMinter(address _minter) external onlyRole(DEFAULT_ADMIN_ROLE) {
    _revokeRole(MINTER_ROLE, _minter);
  }

  function mint(address _account, uint256 _amount) external onlyRole(MINTER_ROLE) {
    _mint(_account, _amount);
  }
}