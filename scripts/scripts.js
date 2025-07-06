const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");
const { FordefiWeb3Provider } = require("@fordefi/web3-provider");
require("dotenv").config();

const contractAddress = "0x19D9cf43D0f1664ea1E74CE5F3266a20AF205Dc1";
const myAddress = "0xf19a57C8Fa55507eFB449Ed4F50601FFbCc7bb53";
const fordefiVaultAddress = "0x7f031632d516334fF6BA9a92B6fe947CF3f5Daa8";

async function getContractWithFordefi() {
	const networkConfig = hre.network.config;

	const fordefiProvider = new FordefiWeb3Provider({
		address: fordefiVaultAddress,
		apiUserToken: `eyJhbGciOiJFZERTQSIsImtpZCI6ImZ3MFc3aVpocUc0SUEzaXV4ZmhQIiwidHlwIjoiSldUIn0.eyJpc3MiOiJodHRwczovL2FwaS5mb3JkZWZpLmNvbS8iLCJzdWIiOiIyYTMzNGI3Ny1lZGI3LTRhMzYtYmViZS03YzQwNTJmYzdkY2ZAZm9yZGVmaSIsImF1ZCI6WyJodHRwczovL2FwaS5mb3JkZWZpLmNvbS9hcGkvIl0sImV4cCI6MjA2Njk4NzYwMCwiaWF0IjoxNzUxNjI3NjAwLCJqdGkiOiI3MDc0M2FhNi01ODcyLTQ2NjktYWQ3Yi03ZDlmNjE3NWY0N2QifQ.qsUvsnEPdyOAYVltidezhHBZbeTELK36NFaoxZn5uV4nem71jiVQjyVMHeme9LNtEgE07uzG1YuYYDDi3B_mDQ`,
		apiPayloadSignKey: `MHcCAQEEIJYPTW3kNEgQIuhrKwEdtW3Khx1GRSkki6jRxdOAcR0uoAoGCCqGSM49AwEHoUQDQgAE1rurBEFo004+vSwxq1J0ocuL67AYf96FPi0tRwfc2ZBuGSf/B9l+PAkTbltwl4QlZUNWfpjRqpleT+WnnJh8aQ==`,
		chainId: networkConfig.chainId,
		rpcUrl: networkConfig.url,
	});

	const provider = new hre.ethers.BrowserProvider(fordefiProvider);
	const signer = await provider.getSigner();

	return await hre.ethers.getContractAt(
		"MinterContract",
		contractAddress,
		signer
	);
}

async function addTier() {
	const factory = await getContractWithFordefi();
	const hasRole = await factory.hasRole(
		await factory.DEFAULT_ADMIN_ROLE(),
		fordefiVaultAddress
	);
	console.log("My wallet is admin?", hasRole);
	console.log("getTiersCollections: ", await factory.getTiersCollections());

	let tx = await factory.AddTier(
		"Chrono Fragment α-001",
		"FOG",
		99999999,
		myAddress,
		0
	);
	await tx.wait();

	console.log("getTiersCollections: ", await factory.getTiersCollections());
}

async function setPublicKey() {
	const factory = await getContractWithFordefi();

	const tx = await factory.setPublicKey(myAddress);
	await tx.wait();

	console.log("✅ Public key set to:", myAddress);
}

async function mint() {
	const factory = await getContractWithFordefi();
	const provider = new ethers.JsonRpcProvider(
		"https://mainnet-rpc.helachain.com"
	);
	const privateKey = process.env.PRIVATE_KEY;
	const signer = new ethers.Wallet(privateKey, provider);
	const nonce = await factory.getUserNonce(myAddress);
	console.log("Nonce for user:", nonce);
	const domain = {
		name: "MintingHash",
		version: "1",
		chainId: 8668,
		verifyingContract: contractAddress,
	};
	const types = {
		MintingHash: [
			{ name: "tierID", type: "uint256" },
			{ name: "to", type: "address" },
			{ name: "nonce", type: "uint256" },
		],
	};
	const value = {
		tierID: 0,
		to: myAddress,
		nonce: nonce,
	};
	const signature = await signer.signTypedData(domain, types, value);
	const messageHash = ethers.TypedDataEncoder.hash(domain, types, value);

	const tx = await factory.mint(0, myAddress, "123", messageHash, signature, 5);
	await tx.wait();

	console.log("getTiersCollections: ", await factory.getTiersCollections());
	console.log("Minting transaction hash: ", tx.hash);
}

addTier().catch((error) => {
	console.error("callInitialize", error);
	process.exitCode = 1;
});

// async function callInitialize() {
// 	const factory = await getContractWithFordefi();
// 	console.log("Signer public key:", await factory.signerPublicKey());
// 	const hasRole = await factory.hasRole(
// 		await factory.DEFAULT_ADMIN_ROLE(),
// 		contractAddress
// 	);
// 	console.log("My wallet is admin?", hasRole);
// 	const hasRole2 = await factory.hasRole(
// 		await factory.DEFAULT_ADMIN_ROLE(),
// 		myAddress
// 	);
// 	console.log("My wallet is admin?", hasRole2);
// 	const hasRole3 = await factory.hasRole(
// 		await factory.DEFAULT_ADMIN_ROLE(),
// 		fordefiVaultAddress
// 	);
// 	console.log("Fordefi vault is admin?", hasRole3);
// 	// await tx.wait();
// 	// console.log("Contract initialized!");
// }
// addTier().catch((error) => {
// 	console.error("Error:", error);
// 	process.exitCode = 1;
// });