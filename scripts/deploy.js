const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");
const { FordefiWeb3Provider } = require("@fordefi/web3-provider");
const fs = require("fs");
require("dotenv").config();

const myAddress = "0x7f031632d516334fF6BA9a92B6fe947CF3f5Daa8";

async function deploy() {
	const gasPrice = hre.ethers.parseUnits("1", "gwei");

	const networkConfig = hre.network.config;
	const fordefiProvider = new FordefiWeb3Provider({
		address: myAddress,
		apiUserToken: "<api-user-access-token>",
		apiPayloadSignKey: "<api-user-private-key.pem-file-contents>",
		chainId: networkConfig.chainId,
		rpcUrl: networkConfig.url,
	});

	const provider = new hre.ethers.BrowserProvider(fordefiProvider);
	const signer = await provider.getSigner();

	const contract = await ethers.getContractFactory("MinterContract", signer);
	const proxy = await upgrades.deployProxy(contract, [myAddress], {
		kind: "uups",
		gasPrice,
		gasLimit: 5000000,
	});
	await proxy.waitForDeployment();
	const proxy_addr = await proxy.getAddress();
	console.log(`MinterContract proxy address: `, proxy_addr);
	const factoryImplAddress = await getImplementationAddress(
		ethers.provider,
		proxy_addr
	);
	console.log(
		`MinterContract implementation contract address: `,
		factoryImplAddress
	);
}

deploy().catch((error) => {
	console.error("deploy_NodeSale", error);
	process.exitCode = 1;
});
