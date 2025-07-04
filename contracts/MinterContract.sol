// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/utils/cryptography/draft-EIP712Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ERC1967/ERC1967UpgradeUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./NFT.sol";

contract MinterContract is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable,
    EIP712Upgradeable
{
    // Variables and Constants ======================================================
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    address public signerPublicKey;
    mapping(address => uint256) public userNonces;
    uint256[] public tierIDList;
    mapping(uint256 tierID => address tierCollectionAddress) public allTiers;
    mapping(bytes32 purchaseID => bool mintStatus) public sold;

    // Events =======================================================================
    event NewTierAdded(address indexed mainNFT);
    event NewTokenMinted(
        address indexed user,
        address indexed category,
        uint256 indexed tokenID
    );

    // Errors =======================================================================
    error AlreadyDeployed();
    error InvalidHash(string issue);
    error InvalidTierID(string issue);

    // =============================== Initializers =================================
    function initialize(address admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __EIP712_init("MintingHash", "1");

        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(OPERATOR_ROLE, admin);
        _setupRole(UPGRADER_ROLE, admin);
        _setupRole(PAUSER_ROLE, admin);

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        _setupRole(UPGRADER_ROLE, msg.sender);
        _setupRole(PAUSER_ROLE, msg.sender);
        signerPublicKey = msg.sender;
    }

    /// ================================= BODY ===================================
    ///
    ///
    // ================================ FUNCTIONS ================================

    function AddTier(
        string calldata _name,
        string calldata _symbol,
        uint256 _maxSupply,
        address _admin,
        uint256 _tierID
    ) external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        if (allTiers[_tierID] != address(0)) revert AlreadyDeployed();
        NFT NFTCollection = new NFT();
        NFT(NFTCollection).initialize(_name, _symbol, _maxSupply, _admin);
        address NFTAddress = address(NFTCollection);
        allTiers[_tierID] = NFTAddress;
        tierIDList.push(_tierID);
        emit NewTierAdded(NFTAddress);
    }

    function mint(
        uint256 _tierID,
        address _to,
        string calldata _uri,
        bytes32 _messageHash,
        bytes memory _signature,
        uint _qty
    ) external whenNotPaused {
        if (
            sold[_messageHash] ||
            !verifyReferralCode(_tierID, _to, _messageHash, _signature)
        ) revert InvalidHash("Invalid Hash!");

        address tier = allTiers[_tierID];
        if (tier == address(0)) revert InvalidTierID("Tier ID does not exist!");

        sold[_messageHash] = true;
        uint256 tokenId = NFT(tier).mint(_to, _uri, _qty);
        userNonces[_to]++;
        emit NewTokenMinted(_to, tier, tokenId);
    }

    function getUserNonce(address user) external view returns (uint256) {
        return userNonces[user];
    }

    function setPublicKey(
        address _newPublicKey
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        signerPublicKey = _newPublicKey;
    }

    function pause() external whenNotPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external whenPaused onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function getTiersCollections() external view returns (address[] memory) {
        address[] memory results = new address[](tierIDList.length);
        for (uint256 i = 0; i < results.length; i++) {
            results[i] = allTiers[tierIDList[i]];
        }
        return results;
    }

    function getTierCollectionById(
        uint256 _tierID
    ) external view returns (address) {
        return allTiers[_tierID];
    }

    function verifyReferralCode(
        uint256 _tierID,
        address _to,
        bytes32 _messageHash,
        bytes memory _signature
    ) public view returns (bool) {
        // Reconstruct the digest
        bytes32 digest = _hashTypedDataV4(
            keccak256(
                abi.encode(
                    keccak256(
                        "MintingHash(uint256 tierID,address to,uint256 nonce)"
                    ),
                    _tierID,
                    _to,
                    userNonces[_to]
                )
            )
        );

        // Verify that the reconstructed digest matches the provided message hash
        require(digest == _messageHash, "Message hash mismatch");

        // Recover the signer from the signature
        address signer = ECDSAUpgradeable.recover(_messageHash, _signature);

        // Verify that the signer is the authorized signer
        return signer == signerPublicKey;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
