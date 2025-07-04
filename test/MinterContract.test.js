const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("MinterContract", function () {
	let MinterContract;
	let minterContract;
	let owner;
	let addr1;
	let addr2;
	let addrs;

	beforeEach(async function () {
		[owner, addr1, addr2, ...addrs] = await ethers.getSigners();

		const MinterContractFactory = await ethers.getContractFactory(
			"MinterContract"
		);
		minterContract = await upgrades.deployProxy(MinterContractFactory, [
			owner.address,
		]);
		await minterContract.waitForDeployment();
	});

	describe("Deployment", function () {
		it("Should set the right owner", async function () {
			expect(
				await minterContract.hasRole(
					await minterContract.DEFAULT_ADMIN_ROLE(),
					owner.address
				)
			).to.equal(true);
		});

		it("Should assign the admin role to the owner", async function () {
			expect(
				await minterContract.hasRole(
					await minterContract.DEFAULT_ADMIN_ROLE(),
					owner.address
				)
			).to.equal(true);
		});
	});

	describe("Tier Management", function () {
		it("Should add a new tier", async function () {
			const tierID = 1;
			await expect(
				minterContract.AddTier("TestNFT", "TNFT", 1000, owner.address, tierID)
			).to.emit(minterContract, "NewTierAdded");

			const tierAddress = await minterContract.getTierCollectionById(tierID);
			expect(tierAddress).to.not.equal(ethers.ZeroAddress);
		});

		it("Should revert when adding an existing tier", async function () {
			const tierID = 1;
			await minterContract.AddTier(
				"TestNFT",
				"TNFT",
				1000,
				owner.address,
				tierID
			);
			await expect(
				minterContract.AddTier("TestNFT2", "TNFT2", 1000, owner.address, tierID)
			).to.be.revertedWithCustomError(minterContract, "AlreadyDeployed");
		});
	});

	describe("Minting", function () {
		it("Should mint a new token", async function () {
			const tierID = 0;
			await minterContract.AddTier(
				"TestNFT",
				"TNFT",
				1000,
				owner.address,
				tierID
			);

			const domain = {
				name: "MintingHash",
				version: "1",
				chainId: (await ethers.provider.getNetwork()).chainId,
				verifyingContract: await minterContract.getAddress(),
			};

			const types = {
				MintingHash: [
					{ name: "tierID", type: "uint256" },
					{ name: "to", type: "address" },
					{ name: "nonce", type: "uint256" },
				],
			};

			const value = {
				tierID: tierID,
				to: addr1.address,
				nonce: 0,
			};

			const signature = await owner.signTypedData(domain, types, value);
			const messageHash = ethers.TypedDataEncoder.hash(domain, types, value);

			await expect(
				minterContract.mint(
					tierID,
					addr1.address,
					"tokenURI",
					messageHash,
					signature
				)
			)
				.to.emit(minterContract, "NewTokenMinted")
				.withArgs(
					addr1.address,
					await minterContract.getTierCollectionById(tierID),
					0
				);
		});

		it("Should revert when minting with invalid signature", async function () {
			const tierID = 0;
			await minterContract.AddTier(
				"TestNFT",
				"TNFT",
				1000,
				owner.address,
				tierID
			);

			const invalidSignature = "0x1234567890";
			const invalidMessageHash = ethers.keccak256(
				ethers.toUtf8Bytes("invalid")
			);

			await expect(
				minterContract.mint(
					tierID,
					addr1.address,
					"tokenURI",
					invalidMessageHash,
					invalidSignature
				)
			).to.be.revertedWith("Message hash mismatch");
		});
	});

	describe("Access Control", function () {
		it("Should allow admin to pause and unpause", async function () {
			await minterContract.pause();
			expect(await minterContract.paused()).to.equal(true);

			await minterContract.unpause();
			expect(await minterContract.paused()).to.equal(false);
		});

		it("Should not allow non-admin to pause", async function () {
			await expect(minterContract.connect(addr1).pause()).to.be.reverted;
		});
	});

	describe("Upgradeability", function () {
		it("Should upgrade the contract", async function () {
			const MinterContractV2 = await ethers.getContractFactory(
				"MinterContract"
			);
			const upgradedContract = await upgrades.upgradeProxy(
				await minterContract.getAddress(),
				MinterContractV2
			);

			expect(await upgradedContract.getAddress()).to.equal(
				await minterContract.getAddress()
			);
		});
	});

	it("Should allow multiple users to mint with different nonces", async function () {
		const tierID = 2;
		await minterContract.AddTier(
			"MultiNFT",
			"MNFT",
			1000,
			owner.address,
			tierID
		);

		const domain = {
			name: "MintingHash",
			version: "1",
			chainId: (await ethers.provider.getNetwork()).chainId,
			verifyingContract: await minterContract.getAddress(),
		};

		const types = {
			MintingHash: [
				{ name: "tierID", type: "uint256" },
				{ name: "to", type: "address" },
				{ name: "nonce", type: "uint256" },
			],
		};

		for (let i = 0; i < 3; i++) {
			const user = addrs[i];
			const nonce = await minterContract.getUserNonce(user.address);

			const value = {
				tierID: tierID,
				to: user.address,
				nonce: nonce,
			};

			const signature = await owner.signTypedData(domain, types, value);
			const messageHash = ethers.TypedDataEncoder.hash(domain, types, value);

			await expect(
				minterContract
					.connect(user)
					.mint(tierID, user.address, `uri-${i}.json`, messageHash, signature)
			)
				.to.emit(minterContract, "NewTokenMinted")
				.withArgs(
					user.address,
					await minterContract.getTierCollectionById(tierID),
					i + 1 // tokenId is 1-based in most ERC721s
				);
		}
	});

	it("Should revert if user tries to mint with the same nonce twice", async function () {
		const tierID = 3;
		await minterContract.AddTier(
			"ReplayNFT",
			"RNFT",
			1000,
			owner.address,
			tierID
		);

		const domain = {
			name: "MintingHash",
			version: "1",
			chainId: (await ethers.provider.getNetwork()).chainId,
			verifyingContract: await minterContract.getAddress(),
		};

		const types = {
			MintingHash: [
				{ name: "tierID", type: "uint256" },
				{ name: "to", type: "address" },
				{ name: "nonce", type: "uint256" },
			],
		};

		const user = addr2;
		const nonce = await minterContract.getUserNonce(user.address);

		const value = {
			tierID: tierID,
			to: user.address,
			nonce: nonce,
		};

		const signature = await owner.signTypedData(domain, types, value);
		const messageHash = ethers.TypedDataEncoder.hash(domain, types, value);

		// First mint — should succeed
		await minterContract
			.connect(user)
			.mint(tierID, user.address, "uri.json", messageHash, signature);

		// Second mint with same signature — should fail
		await expect(
			minterContract
				.connect(user)
				.mint(tierID, user.address, "uri.json", messageHash, signature)
		).to.be.revertedWith("Invalid Hash!");
	});
});
