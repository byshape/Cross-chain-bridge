import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const getContract = async (contract: string, hre:HardhatRuntimeEnvironment) => {
  const erc20Factory = await hre.ethers.getContractFactory("Bridge");
  return erc20Factory.attach(contract);
}

task("isSupportedChain", "Checking if the chain the list of supported chains")
.addParam("contract", "Bridge address", undefined, types.string)
.addParam("chainid", "Chain id", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let bridge = await getContract(taskArgs.contract, hre);
    let isSupported = await bridge.isSupportedChain(taskArgs.chainid);
    console.log(taskArgs.chainid, "chain is supported: ", isSupported.toString());
});

task("addChain", "Adding a new chain to the list of supported chains")
.addParam("contract", "Bridge address", undefined, types.string)
.addParam("chainid", "Chain id", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let bridge = await getContract(taskArgs.contract, hre);
    await bridge.addChain(taskArgs.chainid);
    console.log(taskArgs.chainid, "chain was added");
});

task("swap", "Transferring tokens from one chain to another")
.addParam("contract", "Bridge address", undefined, types.string)
.addParam("chainid", "Chain id", undefined, types.string)
.addParam("to", "Address of the recipient", undefined, types.string)
.addParam("amount", "Amount to transfer", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let bridge = await getContract(taskArgs.contract, hre);
    await bridge.swap(taskArgs.chainid, taskArgs.to, taskArgs.amount);
    console.log("Tokens were swapped");
});

task("redeem", "Receiving tokens on one chain from another")
.addParam("contract", "Bridge address", undefined, types.string)
.addParam("chainid", "Chain id", undefined, types.string)
.addParam("to", "Address of the recipient", undefined, types.string)
.addParam("amount", "Amount to transfer", undefined, types.string)
.addParam("nonce", "Unique swap id", undefined, types.string)
.setAction(async (taskArgs, hre) => {
    let bridge = await getContract(taskArgs.contract, hre);

    let message = hre.ethers.utils.solidityKeccak256(
        ["uint256", "address", "uint256", "uint256"],
        [taskArgs.chainid, taskArgs.to, taskArgs.amount, taskArgs.nonce]
    );
    let admin: SignerWithAddress;
    [admin] = await hre.ethers.getSigners();
    let signature = await admin.signMessage(hre.ethers.utils.arrayify(message));
    let sig = hre.ethers.utils.splitSignature(signature);

    await bridge.redeem(
        taskArgs.chainid, taskArgs.to, taskArgs.amount, taskArgs.nonce, sig.v, sig.r, sig.s
    );
    console.log("Tokens were redeemed");
});