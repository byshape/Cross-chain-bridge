//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IERC20 {
    function burn(address owner, uint256 value) external;
    function mint(address owner, uint256 value) external;

    function balanceOf(address owner) external view returns (uint256);
}