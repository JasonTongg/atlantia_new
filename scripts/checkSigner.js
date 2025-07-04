const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

const contractAddress = "0x319Aa7eB350969FAd70B2A8477fEEF7Fb687012e";
const myAddress = "0xD45b5b90F6b0a20350160794174238cfe95c078C";
const provider = new ethers.JsonRpcProvider(
	"https://testnet-rpc.helachain.com"
);
const privateKey = process.env.PRIVATE_KEY;
const signer = new ethers.Wallet(privateKey, provider);

async function mintWithNonce(index) {
	const factory = await hre.ethers.getContractAt(
		"MinterContract",
		contractAddress
	);
	const nonce = await factory.getUserNonce(myAddress);

	const domain = {
		name: "MintingHash",
		version: "1",
		chainId: 666888,
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

	try {
		const uri = `ipfs://token-${index}.json`;
		const tx = await factory.mint(0, myAddress, uri, messageHash, signature, {
			gasPrice: ethers.parseUnits("2", "gwei"),
		});
		const receipt = await tx.wait();

		console.log(`✅ Mint ${index} success: tx hash = ${tx.hash}`);
	} catch (err) {
		console.error(`❌ Mint ${index} failed:`, err.message);
	}
}

async function main() {
	console.log("🔑 User:", myAddress);
	console.log("🚀 Starting concurrent minting...\n");

	// Simulate 5 mints in sequence
	for (let i = 0; i < 5; i++) {
		await mintWithNonce(i);
	}

	console.log("\n✅ Done.");
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
