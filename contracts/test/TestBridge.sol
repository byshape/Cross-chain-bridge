//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../Bridge.sol";

contract TestBridge is Bridge {
    /// @param validator Address used for signing messages
    /// @param erc20 ERC20 token address
    /// @param chainId Current chain id
    /// @dev chainId parameter is used only for emulating cross-chain interactions when deployed to one chain.
    constructor(address validator, address erc20, uint256 chainId) Bridge(validator, erc20) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _validator = validator;
        _erc20 = erc20;
        _chainId = chainId;
    }

}