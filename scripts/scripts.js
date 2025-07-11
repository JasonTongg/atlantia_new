const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");
const { FordefiWeb3Provider } = require("@fordefi/web3-provider");

require("dotenv").config();

const contractAddress = "0x76e20Ae7ad2c134E521634A33d3041b77B3185b4";
const myAddress = "0xeFF3521fb13228C767Ad6Dc3b934F9eFAC9c56aD";
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

//const factory = await getContractWithFordefi();

async function addTier() {
	const factory = await hre.ethers.getContractAt(
		"MinterContract",
		contractAddress
	);
	const hasRole = await factory.hasRole(
		await factory.DEFAULT_ADMIN_ROLE(),
		fordefiVaultAddress
	);
	console.log("My wallet is admin?", hasRole);
	console.log("getTiersCollections: ", await factory.getTiersCollections());

	let tx = await factory.AddTier(
		"Chrono Fragment α-007",
		"FOG",
		99999999,
		myAddress,
		3
	);
	await tx.wait();

	console.log("getTiersCollections: ", await factory.getTiersCollections());
}

async function setPublicKey() {
	const factory = await hre.ethers.getContractAt(
		"MinterContract",
		contractAddress
	);
	const tx = await factory.setPublicKey(myAddress);
	await tx.wait();

	const signer = await factory.signerPublicKey();

	console.log("✅ Public key set to:", signer);
}

async function burn() {
	const factory = await hre.ethers.getContractAt(
		"MinterContract",
		contractAddress
	);

	const tiers = await factory.getTiersCollections();

	const tier2 = tiers[3];
	console.log("Address: ", tier2);

	const tierContract = await hre.ethers.getContractAt("NFT", tier2);

	const tx = await tierContract.safeTransferFrom(
		myAddress,
		"0x000000000000000000000000000000000000dEaD",
		19
	);
	await tx.wait();
	console.log("Burn Success: ", tx.hash);
}

async function mint() {
	// Load signer from private key
	const provider = new ethers.JsonRpcProvider(
		"https://testnet-rpc.helachain.com"
	);
	const privateKey = process.env.PRIVATE_KEY;

	if (!privateKey) {
		console.error("❌ PRIVATE_KEY is not set in your .env file.");
		process.exit(1);
	}

	const signer = new ethers.Wallet(privateKey, provider);
	console.log("✅ Signer address:", signer.address);

	// Check balance
	const balance = await provider.getBalance(signer.address);
	console.log("💰 Balance:", ethers.formatEther(balance), "HELA");

	if (balance < ethers.parseEther("0.01")) {
		console.error(
			"❌ Insufficient balance. Please fund this address on the Helachain testnet."
		);
		process.exit(1);
	}

	// Get contract with signer
	const factory = await hre.ethers.getContractAt(
		"MinterContract",
		contractAddress,
		signer
	);

	// Optional: log current tiers
	const tiers = await factory.getTiersCollections();
	console.log("📦 getTiersCollections:", tiers);

	// Prepare EIP-712 signature
	const nonce = await factory.getUserNonce(myAddress);
	console.log("🔢 Nonce for user:", nonce.toString());

	console.log("✅ myAddress:", myAddress);
	console.log("Signer address     :", signer.address);
	console.log("Signer public key :", await factory.signerPublicKey());

	const { chainId } = await provider.getNetwork();
	console.log("✅ Actual chain ID:", chainId);

	const domain = {
		name: "MintingHash",
		version: "1",
		chainId: Number(chainId),
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
		tierID: 3,
		to: myAddress,
		nonce: nonce,
	};

	const signature = await signer.signTypedData(domain, types, value);
	const messageHash = ethers.TypedDataEncoder.hash(domain, types, value);
	const digest = ethers.TypedDataEncoder.hash(domain, types, value); // sama dengan messageHash
	console.log("🧾 Digest        :", digest);
	console.log("🧾 Message Hash  :", messageHash);
	console.log("🖋 Signature     :", signature);

	const tierAddress = await factory.getTierCollectionById(0);
	const nft = await hre.ethers.getContractAt("NFT", tierAddress, signer);
	const maxSupply = await nft.maxSupply();
	const totalMinted = await nft.totalMinted();
	console.log(`🎯 Tier 0 supply: ${totalMinted}/${maxSupply}`);

	const hasMinterRole = await nft.hasRole(
		await nft.MINTER_ROLE(),
		factory.target // address of the MinterContract
	);
	console.log("✅ MinterContract has MINTER_ROLE:", hasMinterRole);

	const isPaused = await factory.paused();
	console.log(`🚦 Contract is ${isPaused ? "⛔ PAUSED" : "✅ NOT paused"}`);

	const isSold = await factory.sold(messageHash);
	console.log("Is Sold: ", isSold);

	// Call mint function
	let tx;

	try {
		const feeData = await provider.getFeeData();
		console.log(
			"📊 Suggested gas price:",
			ethers.formatUnits(feeData.gasPrice, "gwei"),
			"gwei"
		);

		tx = await factory.mint(3, myAddress, "123", messageHash, signature, 10);
		await tx.wait();
		console.log("✅ Minted!");
	} catch (e) {
		console.error("❌ Mint failed:", e.reason || e.message);
	}

	console.log("✅ Minted successfully!");
	console.log("🔗 Tx Hash:", tx.hash);

	// Optional: show updated tiers
	const updated = await factory.getTiersCollections();
	console.log("📦 Updated getTiersCollections:", updated);
	const isSold2 = await factory.sold(messageHash);
	console.log("Is Sold: ", isSold2);
}
mint().catch((error) => {
	console.error("callInitialize", error);
	process.exitCode = 1;
});
// mint().catch((error) => {
// 	console.error("callInitialize", error);
// 	process.exitCode = 1;
// });

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
