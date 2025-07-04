// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract NFT is
    Initializable,
    ERC721URIStorageUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public maxSupply;
    uint256 public totalMinted;
    address public approvedContract;
    string public baseTokenURI;

    // Errors =======================================================================
    error PermissionDenied();
    error TransferLocked();
    error InvalidApprovedContract();

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        address _admin
    ) public initializer {
        __ERC721_init(_name, _symbol);
        __ERC721URIStorage_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(UPGRADER_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);

        _setupRole(DEFAULT_ADMIN_ROLE, _admin);
        _setupRole(UPGRADER_ROLE, _admin);
        _setupRole(MINTER_ROLE, _admin);

        maxSupply = _maxSupply;
        totalMinted = 0;
    }

    function mint(
        address to,
        string calldata _uri,
        uint qty
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        if (totalMinted + qty > maxSupply) revert PermissionDenied();
        for (uint i = 0; i < qty; i++) {
            _safeMint(to, totalMinted);
            _setTokenURI(totalMinted, _uri);
            totalMinted++;
        }

        return totalMinted - 1;
    }

    function burn(uint256 tokenId) external {
        if (!_isApprovedOrOwner(_msgSender(), tokenId))
            revert PermissionDenied();
        _burn(tokenId);
        totalMinted--;
    }

    function setBaseURI(
        string memory _baseTokenURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseTokenURI = _baseTokenURI;
    }

    function setTokenURI(
        uint256 _tokenId,
        string memory _tokenURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setTokenURI(_tokenId, _tokenURI);
    }

    function totalMintedCount() external view returns (uint256) {
        return totalMinted;
    }

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    // ================================ PROXY RELATED FUNCTIONS ===============
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC721Upgradeable, AccessControlUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @dev overriding proxy required internal function
     * @param newImplementation new implementation contract address
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
