const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");
const { FordefiWeb3Provider } = require("@fordefi/web3-provider");
const fs = require("fs");
require("dotenv").config();

const myAddress = "0x7f031632d516334fF6BA9a92B6fe947CF3f5Daa8";

async function deploy() {
	const gasPrice = hre.ethers.parseUnits("1", "gwei");

	const networkConfig = hre.network.config;
	console.log(
		`Deploying to network: ${networkConfig.chainId} - ${networkConfig.url}`
	);
	const fordefiProvider = new FordefiWeb3Provider({
		address: myAddress,
		apiUserToken: `eyJhbGciOiJFZERTQSIsImtpZCI6ImZ3MFc3aVpocUc0SUEzaXV4ZmhQIiwidHlwIjoiSldUIn0.eyJpc3MiOiJodHRwczovL2FwaS5mb3JkZWZpLmNvbS8iLCJzdWIiOiIyYTMzNGI3Ny1lZGI3LTRhMzYtYmViZS03YzQwNTJmYzdkY2ZAZm9yZGVmaSIsImF1ZCI6WyJodHRwczovL2FwaS5mb3JkZWZpLmNvbS9hcGkvIl0sImV4cCI6MjA2Njk4NzYwMCwiaWF0IjoxNzUxNjI3NjAwLCJqdGkiOiI3MDc0M2FhNi01ODcyLTQ2NjktYWQ3Yi03ZDlmNjE3NWY0N2QifQ.qsUvsnEPdyOAYVltidezhHBZbeTELK36NFaoxZn5uV4nem71jiVQjyVMHeme9LNtEgE07uzG1YuYYDDi3B_mDQ`,
		apiPayloadSignKey: `MHcCAQEEIJYPTW3kNEgQIuhrKwEdtW3Khx1GRSkki6jRxdOAcR0uoAoGCCqGSM49AwEHoUQDQgAE1rurBEFo004+vSwxq1J0ocuL67AYf96FPi0tRwfc2ZBuGSf/B9l+PAkTbltwl4QlZUNWfpjRqpleT+WnnJh8aQ==`,
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
