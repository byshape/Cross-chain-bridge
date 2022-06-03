# Description
This is a cross-chain bridge contract to transfer tokens between different chains. It's main features:
* Bridge adds new chains to the list of supported chains.
* Bridge burns tokens on the fisrt chain.
* Bridge mints tokens on the second chain.

## Launch instructions
Run this command in terminal
```
npm install --save-dev hardhat
```
When installation process is finished, create `.env` file and add `API_URL`, `PRIVATE_KEY`, `ETHERSCAN_API_KEY` and `BSCSCAN_API_KEY` variables there.

Run:
* `npx hardhat test` to run tests
* `npx hardhat coverage` to get coverage report
* `npx hardhat run --network rinkeby scripts/deploy-20.ts` to deploy ERC20 smart contract to the rinkeby testnet
* `npx hardhat run --network rinkeby scripts/deploy.ts` to deploy Bridge smart contract to the rinkeby testnet
* Remove `ERC20_ADDRESS` info from .env file before run next command
* `npx hardhat run --network bscTestnet scripts/deploy-20.ts` to deploy ERC20 smart contract to the Binance Smart Chain testnet
* `npx hardhat run --network bscTestnet scripts/deploy.ts` to deploy Bridge smart contract to the Binance Smart Chain testnet
* `npx hardhat verify --network NETWORK DEPLOYED_CONTRACT_ADDRESS` to verify marketplace contract or tokens
* `npx hardhat help` to get the list of available tasks, including tasks for interaction with deployed contracts.