import fs from 'fs';
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


async function main() {
  const initialSupply: bigint = BigInt(1000 * 10 ** 18);

  let admin: SignerWithAddress;
  [admin] = await ethers.getSigners();

  // deploy tokens
  const erc20Factory = await ethers.getContractFactory("ERC20", admin);
  const erc20 = await erc20Factory.deploy("Test token", "TST", 18, initialSupply, admin.address);
  await erc20.deployed();
  console.log(`erc20 ${erc20.address}`);
  fs.appendFileSync(`.env`, 
    `\rERC20_ADDRESS=${erc20.address}\r`)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});