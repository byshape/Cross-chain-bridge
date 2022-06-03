import fs from 'fs';
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { ERC20 } from "../typechain";

async function main() {
  const MINTER_ROLE: string = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MINTER_ROLE"));
  const BURNER_ROLE: string = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("BURNER_ROLE"));

  let admin: SignerWithAddress;
  [admin] = await ethers.getSigners();

  const erc20 = <ERC20>(await ethers.getContractAt("ERC20", process.env.ERC20_ADDRESS as string));

  // deploy bridge
  const bridgeFactory = await ethers.getContractFactory("Bridge", admin);
  const bridge = await bridgeFactory.deploy(admin.address, erc20.address);
  await bridge.deployed();
  console.log(`bridge ${bridge.address}`);

  await erc20.grantRole(MINTER_ROLE, bridge.address);
  await erc20.grantRole(BURNER_ROLE, bridge.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});