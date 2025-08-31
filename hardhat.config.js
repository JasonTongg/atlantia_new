require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("@nomiclabs/hardhat-solhint");
require("dotenv").config();

const etherscan_key = process.env.ETHERSCAN_TOKEN;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
	solidity: {
		compilers: [
			{
				version: "0.8.24",
				settings: {
					optimizer: {
						enabled: true,
						runs: 50,
					},
				},
			},
		],
	},
	gasReporter: {
		enabled: true,
	},
	networks: {
		hardhat: {
			// forking: {
			// 	url: "https://eth-mainnet.g.alchemy.com/v2/5s3WOY3GmTQMtQN5iMaibPeMsQ6D4-Ue",
			// },
		},
		hela: {
			url: "https://testnet-rpc.helachain.com",
			chainId: 666888,
			accounts: [
				"27a529bad9848d28dde6e49089e410cb34470ac0071fbb4faf3dee5b5119aab6",
			],
		},
		mainnet: {
			url: "https://mainnet-rpc.helachain.com",
			chainId: 8668,
			accounts: [
				"27a529bad9848d28dde6e49089e410cb34470ac0071fbb4faf3dee5b5119aab6",
			],
		},
	},
	etherscan: {
		apiKey: {
			hela: "abc",
			goerli: etherscan_key,
			sepolia: "AIY3USGX4TGAW2QD3XW5KMVQ1IQ5IR916E",
		},
		customChains: [
			{
				network: "hela",
				chainId: 666888,
				urls: {
					apiURL: "https://testnet-blockexplorer.helachain.com/api",
					browserURL: "https://testnet-blockexplorer.helachain.com",
				},
			},
		],
	},
	sourcify: {
		// Disabled by default
		// Doesn't need an API key
		enabled: true,
	},
};
