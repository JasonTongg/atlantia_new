const hre = require("hardhat");
const { ethers } = hre;
require("dotenv").config();

const contractAddress = "0x319Aa7eB350969FAd70B2A8477fEEF7Fb687012e";
const rpcUrl = "https://testnet-rpc.helachain.com";
const provider = new ethers.JsonRpcProvider(rpcUrl);

// 4 signers with different private keys
const privateKeys = [
	process.env.PRIVATE_KEY,
	"0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
	"0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
	"0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
];

const chainId = 666888;

async function mintFromUser(privateKey, index) {
	const wallet = new ethers.Wallet(privateKey, provider);
	const userAddress = wallet.address;

	const factory = await hre.ethers.getContractAt(
		"MinterContract",
		contractAddress,
		wallet
	);
	const nonce = await factory.getUserNonce(userAddress);

	const domain = {
		name: "MintingHash",
		version: "1",
		chainId,
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
		to: userAddress,
		nonce,
	};

	const signature = await wallet.signTypedData(domain, types, value);
	const messageHash = ethers.TypedDataEncoder.hash(domain, types, value);

	const uri = `ipfs://token-${index}.json`;

	try {
		const tx = await factory.mint(0, userAddress, uri, messageHash, signature);
		await tx.wait();
		console.log(
			`✅ User ${index + 1} | ${userAddress} | Nonce: ${nonce} | Tx Hash: ${
				tx.hash
			}`
		);
	} catch (err) {
		console.error(
			`❌ User ${index + 1} | ${userAddress} | Nonce: ${nonce} | Error: ${
				err.message
			}`
		);
	}
}

async function main() {
	console.log("🚀 Starting concurrent mints for multiple users...\n");

	await Promise.all(
		privateKeys.map((pk, i) => {
			return mintFromUser(pk, i);
		})
	);

	console.log("\n✅ Done testing concurrent mints.");
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
