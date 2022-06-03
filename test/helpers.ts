import { ethers } from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

async function deployContract(contractName: string, signer: SignerWithAddress, ...args: any): Promise<any> {
  const contractFactory = await ethers.getContractFactory(contractName, signer);
  const contract = await contractFactory.deploy(...args);
  return contract.deployed();
}

export { deployContract };