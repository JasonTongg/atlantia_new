// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/StringsUpgradeable.sol";

contract NFT is
    Initializable,
    ERC721Upgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using StringsUpgradeable for uint256;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public maxSupply;
    uint256 public totalMinted;
    address public approvedContract;
    string public baseTokenURI = "https://example.com/";
    string public _customName;
    string public _customSymbol;

    // Errors =======================================================================
    error PermissionDenied();
    error TransferLocked();
    error InvalidApprovedContract();
    error InvalidTokenId();

    function initialize(
        string memory _name,
        string memory _symbol,
        uint256 _maxSupply,
        address _admin
    ) public initializer {
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
        _customName = _name;
        _customSymbol = _symbol;
    }

    function name() public view override returns (string memory) {
        return _customName;
    }

    function symbol() public view override returns (string memory) {
        return _customSymbol;
    }

    function setName(string memory newName) external onlyRole(MINTER_ROLE) {
        _customName = newName;
    }

    function setSymbol(string memory newSymbol) external onlyRole(MINTER_ROLE) {
        _customSymbol = newSymbol;
    }

    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            _exists(tokenId),
            "ERC721Metadata: URI query for nonexistent token"
        );

        string memory base = _baseURI();
        return
            bytes(base).length > 0
                ? string(abi.encodePacked(base, tokenId.toString(), ".json"))
                : "";
    }

    function mint(
        address to,
        uint256 qty
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        if (totalMinted + qty > maxSupply) revert PermissionDenied();

        unchecked {
            for (uint256 i = 0; i < qty; i++) {
                if (to.code.length == 0) {
                    _mint(to, totalMinted + i);
                } else {
                    _safeMint(to, totalMinted + i);
                }
            }
        }

        totalMinted += qty;
        return totalMinted - 1;
    }

    function burn(uint256 tokenId) external {
        if (!_isApprovedOrOwner(_msgSender(), tokenId))
            revert PermissionDenied();
        if (!_exists(tokenId)) revert InvalidTokenId();
        _burn(tokenId);
    }

    function adminBurn(uint256 tokenId) external onlyRole(MINTER_ROLE) {
        if (!_exists(tokenId)) revert InvalidTokenId();
        _burn(tokenId);
    }

    function adminBatchBurn(
        uint256[] calldata tokenIds
    ) external onlyRole(MINTER_ROLE) {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            uint256 tokenId = tokenIds[i];
            if (!_exists(tokenId)) revert InvalidTokenId();
            _burn(tokenId);
        }
    }

    function setBaseURI(
        string memory _baseTokenURI
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseTokenURI = _baseTokenURI;
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
