//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./IERC20.sol";

/// @title Cross-chain bridge contract to transfer tokens between different chains
/// @author Xenia Shape
/// @notice This contract can be used for only the most basic cross-chain test experiments
contract Bridge is AccessControl {
    using Counters for Counters.Counter;

    event NewChain(uint256 indexed chainId);
    event SwapInitialized(uint256 indexed chainId, address indexed to, uint256 amount, uint256 nonce);
    event Redeemed(uint256 indexed chainId, address indexed to, uint256 amount, uint256 nonce);

    error InvalidChain(uint256 chainId);
    error InvalidMessage();
    error InvalidCaller(address actual, address expected);
    error AlreadyRedeemed();

    uint256 internal _chainId;
    // chain id => is supported
    mapping(uint256 => bool) public chains;
    // hash of redeem order => is redeemed
    mapping(bytes32 => bool) internal _redeems;
    address internal _validator;
    address internal _erc20;

    Counters.Counter internal _nonce;

    /// @param validator Address used for signing messages
    /// @param erc20 ERC20 token address
    constructor(address validator, address erc20) {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _validator = validator;
        _erc20 = erc20;
        _chainId = block.chainid;
    }

    /// @notice Function for adding a new chain to the list of supported chains
    /// @param chainId Id of the chain
    /// @dev Function emits NewChain event
    function addChain(uint256 chainId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        chains[chainId] = true;
        emit NewChain(chainId);
    }

    /// @notice Function for checking if the chain the list of supported chains
    /// @param chainId Id of the chain
    /// @return If chain is supported
    function isSupportedChain(uint256 chainId) external view returns(bool) {
        return chains[chainId];
    }

    /// @notice Function for transferring tokens from one chain to another
    /// @param chainId Id of the chain to transfer
    /// @param to Address of the recipient
    /// @param amount Amount to transfer
    /// @dev Function emits Transfer and SwapInitialized events
    /// @dev Function uses _nonce to ensure that the swap is unique
    function swap(uint256 chainId, address to, uint256 amount) external {
        if (chains[chainId] == false) revert InvalidChain(chainId);
        IERC20(_erc20).burn(msg.sender, amount);
        emit SwapInitialized(chainId, to, amount, _nonce._value);
        _nonce.increment();
    }

    /// @notice Function for receiving tokens on one chain from another
    /// @param chainId Id of the chain to receive
    /// @param to Address of the recipient
    /// @param amount Amount to receive
    /// @param nonce Unique swap id
    /// @param v, r, s Fields of signature
    /// @dev Function emits Transfer and Redeemed events
    function redeem(
        uint256 chainId,
        address to,
        uint256 amount,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // check chainId
        if (chainId != _chainId) revert InvalidChain(chainId);
        (bool isSigned, bytes32 hashMessage) = _checkSign(chainId, to, amount, nonce, v, r, s);
        // check that message is signed
        if (isSigned == false) revert InvalidMessage();
        // check that caller is the recipient
        if (msg.sender != to) revert InvalidCaller(msg.sender, to);
        // check that this signature wasn't redeemed
        if (_redeems[hashMessage] == true) revert AlreadyRedeemed();
        _redeems[hashMessage] = true;
        // send (mint) tokens to the caller
        IERC20(_erc20).mint(msg.sender, amount);
        emit Redeemed(chainId, to, amount, nonce);
    }

    /// @notice Function for checking if the message was signed by the validator
    /// @param chainId Id of the chain to receive
    /// @param to Address of the recipient
    /// @param amount Amount to receive
    /// @param nonce Unique swap id
    /// @param v, r, s Fields of signature
    /// @return Is the message was signed by the validator 
    /// @return Hashed message with prefix
    function _checkSign(
        uint256 chainId,
        address to,
        uint256 amount,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal view returns (bool, bytes32) {
        bytes32 hashMessage = _hashMessage(keccak256(abi.encodePacked(chainId, to, amount, nonce)));
        // get validator address from the incoming params and signature
        // compare it with validator address in the storage variable
        return (ECDSA.recover(hashMessage, v, r, s) == _validator, hashMessage);
    }

    /// @notice Function for adding Ethereum prefix
    /// @param message Hashed message
    /// @return Hashed message with prefix
    function _hashMessage(bytes32 message) internal pure returns(bytes32) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        return keccak256(abi.encodePacked(prefix, message));
    }
}