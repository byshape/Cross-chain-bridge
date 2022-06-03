import { expect } from "chai";
import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { deployContract } from "./helpers";

import { TestBridge, ERC20 } from "../typechain";
import { BigNumber } from "ethers";

describe("Bridge", function () {
  const initialSupply: bigint = BigInt(1000 * 10 ** 18);
  const userSupply: bigint = BigInt(100 * 10 ** 18);
  const amountToSwap: bigint = BigInt(10 * 10 ** 18);
  const MINTER_ROLE: string = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE: string = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE"));
  const chains = {
    mainnet: 1,
    BSC: 56
  }

  let admin: SignerWithAddress;
  let user: SignerWithAddress;
  let user2: SignerWithAddress;
  let validator: SignerWithAddress;

  let bridgeMainnet: TestBridge;
  let bridgeBSC: TestBridge;
  let erc20Mainnet: ERC20;
  let erc20BSC: ERC20;

  let nonce: number = 0;
  let nonceToRedeem: number = nonce;

  before(async () => {
    // get signers
    [admin, user, user2, validator] = await ethers.getSigners();

    // deploy tokens
    erc20Mainnet = await deployContract("ERC20", admin, "Test 20 token", "TST20", 18, initialSupply, admin.address);
    erc20BSC = await deployContract("ERC20", admin, "Test 20 token", "TST20", 18, initialSupply, admin.address);

    // deploy bridges
    bridgeMainnet = await deployContract("TestBridge", admin, validator.address, erc20Mainnet.address, chains.mainnet);
    bridgeBSC = await deployContract("TestBridge", admin, validator.address, erc20BSC.address, chains.BSC);

    // grant minter and burner roles to the bridge
    await erc20Mainnet.grantRole(MINTER_ROLE, bridgeMainnet.address);
    await erc20BSC.grantRole(MINTER_ROLE, bridgeBSC.address);
    await erc20Mainnet.grantRole(BURNER_ROLE, bridgeMainnet.address);
    await erc20BSC.grantRole(BURNER_ROLE, bridgeBSC.address);

    // mint tokens to user
    await erc20Mainnet.mint(user.address, userSupply);

    // approve tokens to the bridge
    await erc20Mainnet.connect(user).approve(bridgeMainnet.address, userSupply);
  });

  it("Should add chain", async function () {
    expect(await bridgeMainnet.isSupportedChain(chains.BSC)).to.be.equal(false);
    expect(await bridgeMainnet.addChain(chains.BSC)).to.emit(bridgeMainnet, "NewChain").withArgs(chains.BSC);
    expect(await bridgeMainnet.isSupportedChain(chains.BSC)).to.be.equal(true);

    expect(await bridgeBSC.isSupportedChain(chains.mainnet)).to.be.equal(false);
    expect(await bridgeBSC.addChain(chains.mainnet)).to.emit(bridgeBSC, "NewChain").withArgs(chains.mainnet);
    expect(await bridgeBSC.isSupportedChain(chains.mainnet)).to.be.equal(true);
  });

  it("Shouldn't swap tokens to unsupported chain", async function () {
    expect(await erc20Mainnet.balanceOf(user.address)).to.be.equal(userSupply);
    await expect(bridgeMainnet.connect(user).swap(
      chains.mainnet, user2.address, amountToSwap
    )).to.revertedWith(`InvalidChain(${chains.mainnet})`);
    expect(await erc20Mainnet.balanceOf(user.address)).to.be.equal(userSupply);
  });

  it("Should swap tokens", async function () {
    expect(await erc20Mainnet.balanceOf(user.address)).to.be.equal(userSupply);
    expect(await bridgeMainnet.connect(user).swap(
      chains.BSC, user2.address, amountToSwap
    )).to.emit(
      bridgeMainnet, "SwapInitialized"
    ).withArgs(
      chains.BSC, user2.address, amountToSwap, nonce);
    nonce++;
    expect(await erc20Mainnet.balanceOf(user.address)).to.be.equal(userSupply - amountToSwap);
  });

  it("Shouldn't redeem tokens in different chain", async function () {
    let message = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "uint256"],
      [chains.mainnet, user2.address, amountToSwap, nonceToRedeem]
    );
    let signature = await validator.signMessage(ethers.utils.arrayify(message));
    let sig = ethers.utils.splitSignature(signature);

    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(0);
    await expect(bridgeBSC.connect(user2).redeem(
      chains.mainnet, user2.address, amountToSwap, nonceToRedeem, sig.v, sig.r, sig.s
    )).to.revertedWith(`InvalidChain(${chains.mainnet})`);
    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(0);
  });

  it("Shouldn't redeem tokens with invalid message", async function () {
    let message = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "uint256"],
      [chains.mainnet, user2.address, amountToSwap, nonceToRedeem]
    );
    let signature = await validator.signMessage(ethers.utils.arrayify(message));
    let sig = ethers.utils.splitSignature(signature);

    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(0);
    await expect(bridgeBSC.connect(user2).redeem(
      chains.BSC, user2.address, amountToSwap, nonceToRedeem, sig.v, sig.r, sig.s
    )).to.revertedWith("InvalidMessage()");
    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(0);
  });

  it("Shouldn't redeem tokens with invalid signature", async function () {
    let message = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "uint256"],
      [chains.BSC, user2.address, amountToSwap, nonceToRedeem]
    );
    let signature = await user2.signMessage(ethers.utils.arrayify(message));
    let sig = ethers.utils.splitSignature(signature);

    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(0);
    await expect(bridgeBSC.connect(user2).redeem(
      chains.BSC, user2.address, amountToSwap, nonceToRedeem, sig.v, sig.r, sig.s
    )).to.revertedWith("InvalidMessage()");
    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(0);
  });

  it("Shouldn't redeem tokens by non-eligible caller", async function () {
    let message = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "uint256"],
      [chains.BSC, user2.address, amountToSwap, nonceToRedeem]
    );
    let signature = await validator.signMessage(ethers.utils.arrayify(message));
    let sig = ethers.utils.splitSignature(signature);

    expect(await erc20BSC.balanceOf(user.address)).to.be.equal(0);
    await expect(bridgeBSC.connect(user).redeem(
      chains.BSC, user2.address, amountToSwap, nonceToRedeem, sig.v, sig.r, sig.s
    )).to.revertedWith(`InvalidCaller("${user.address}", "${user2.address}")`);
    expect(await erc20BSC.balanceOf(user.address)).to.be.equal(0);
  });

  it("Should redeem tokens", async function () {
    let message = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "uint256"],
      [chains.BSC, user2.address, amountToSwap, nonceToRedeem]
    );
    let signature = await validator.signMessage(ethers.utils.arrayify(message));
    let sig = ethers.utils.splitSignature(signature);

    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(0);
    expect(await bridgeBSC.connect(user2).redeem(
      chains.BSC, user2.address, amountToSwap, nonceToRedeem, sig.v, sig.r, sig.s
    )).to.emit(bridgeBSC, "Redeemed").withArgs(chains.BSC, user2.address, amountToSwap, nonceToRedeem);
    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(amountToSwap);
  });

  it("Shouldn't redeem tokens twice", async function () {
    let message = ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256", "uint256"],
      [chains.BSC, user2.address, amountToSwap, nonceToRedeem]
    );
    let signature = await validator.signMessage(ethers.utils.arrayify(message));
    let sig = ethers.utils.splitSignature(signature);

    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(amountToSwap);
    await expect(bridgeBSC.connect(user2).redeem(
      chains.BSC, user2.address, amountToSwap, nonceToRedeem, sig.v, sig.r, sig.s
    )).to.revertedWith("AlreadyRedeemed()");
    expect(await erc20BSC.balanceOf(user2.address)).to.be.equal(amountToSwap);
  });
});
