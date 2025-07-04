const hre = require("hardhat");
const { getImplementationAddress } = require("@openzeppelin/upgrades-core");
require("dotenv").config();

const deployed_address = "0xeB3974e7cB28A8bb753E8B0fDBf4bf5112aFb441";
const DEFAULT_ADMIN_ROLE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";
const OPERATOR_ROLE =
  "0x97667070c54ef182b0f5858b034beac1b6f3089aa2d3188bb1e8929f4fa9b929";

async function upgradeFactory() {
  const contract = await ethers.getContractFactory("MinterContract");
  const proxy = await upgrades.upgradeProxy(deployed_address, contract);
  await proxy.waitForDeployment();
  console.log("Upgrade in progress...");
  const proxy_address = await proxy.getAddress();
  console.log("MinterContract proxy address: ", await proxy_address);
  const implementation_address = await getImplementationAddress(
    ethers.provider,
    proxy_address
  );
  console.log(
    "MinterContract implementation contract address: ",
    implementation_address
  );
}

upgradeFactory().catch((error) => {
  console.error("upgradeFactory", error);
  process.exitCode = 1;
});
