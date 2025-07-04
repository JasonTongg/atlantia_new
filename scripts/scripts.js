const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");
const { FordefiWeb3Provider } = require("@fordefi/web3-provider");
require("dotenv").config();

const contractAddress = "0xd432fd49e36024a9D864851D8E709a5c7cc6c077";
const myAddress = "0xf19a57C8Fa55507eFB449Ed4F50601FFbCc7bb53";
const fordefiVaultAddress = "0x7f031632d516334fF6BA9a92B6fe947CF3f5Daa8";

async function getContractWithFordefi() {
	const networkConfig = hre.network.config;
	const privateKeyPem = fs.readFileSync("./fordefi-private-key.pem", "utf8");

	const fordefiProvider = new FordefiWeb3Provider({
		address: fordefiVaultAddress,
		apiUserToken: process.env.FORDEFI_API_USER_TOKEN,
		apiPayloadSignKey: privateKeyPem,
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
	console.log("getTiersCollections: ", await factory.getTiersCollections());

	let tx = await factory.AddTier(
		"Chrono Fragment α-001",
		"FOG",
		999999,
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

setPublicKey().catch((error) => {
	console.error("Error:", error);
	process.exitCode = 1;
});

// async function mint() {
// 	const factory = await hre.ethers.getContractAt(
// 		"MinterContract",
// 		contractAddress
// 	);
// 	const provider = new ethers.JsonRpcProvider(
// 		"https://testnet-rpc.helachain.com"
// 	);
// 	const privateKey = process.env.PRIVATE_KEY;
// 	const signer = new ethers.Wallet(privateKey, provider);
// 	const nonce = await factory.getUserNonce(myAddress);
// 	console.log("Nonce for user:", nonce);
// 	const domain = {
// 		name: "MintingHash",
// 		version: "1",
// 		chainId: 666888,
// 		verifyingContract: contractAddress,
// 	};
// 	const types = {
// 		MintingHash: [
// 			{ name: "tierID", type: "uint256" },
// 			{ name: "to", type: "address" },
// 			{ name: "nonce", type: "uint256" },
// 		],
// 	};
// 	const value = {
// 		tierID: 0,
// 		to: myAddress,
// 		nonce: nonce,
// 	};
// 	const signature = await signer.signTypedData(domain, types, value);
// 	const messageHash = ethers.TypedDataEncoder.hash(domain, types, value);

// 	const tx = await factory.mint(0, myAddress, "123", messageHash, signature, 5);
// 	await tx.wait();

// 	console.log("getTiersCollections: ", await factory.getTiersCollections());
// 	console.log("Minting transaction hash: ", tx.hash);
// }
