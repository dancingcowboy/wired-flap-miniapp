// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IERC20WiredFlap {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function approve(address spender, uint256 amount) external returns (bool);
}

interface IFlapPortalFsi {
    struct NewTokenV6Params {
        string name;
        string symbol;
        string meta;
        uint8 dexThresh;
        bytes32 salt;
        uint8 migratorType;
        address quoteToken;
        uint256 quoteAmt;
        address beneficiary;
        bytes permitData;
        bytes32 extensionID;
        bytes extensionData;
        uint8 dexId;
        uint8 lpFeeProfile;
        uint16 buyTaxRate;
        uint16 sellTaxRate;
        uint64 taxDuration;
        uint64 antiFarmerDuration;
        uint16 mktBps;
        uint16 deflationBps;
        uint16 dividendBps;
        uint16 lpBps;
        uint256 minimumShareBalance;
        address dividendToken;
        address commissionReceiver;
        uint8 tokenVersion;
    }

    function newTokenV6(NewTokenV6Params calldata params) external payable returns (address token);
}

/// @notice Owner-controlled Flap launch wrapper that publishes a read-only WIRED launch feed to FSI.
/// @dev FSI is never used for settlement. Fee routing remains in the Flap launch parameters.
contract WiredFlapFsiLauncher {
    event FlapSharedIndexerFeed(
        bytes32 ns,
        uint256 id,
        uint256 seq,
        address actor,
        address related,
        uint256 value,
        string data
    );

    error Unauthorized();
    error InvalidConfiguration();
    error LaunchAlreadyIndexed();
    error TransferFailed();
    error ReentrantCall();

    bytes32 public constant NS_LAUNCH = "wired-launch";
    uint256 public constant MAX_DATA_BYTES = 1024;

    address public immutable owner;
    IFlapPortalFsi public immutable portal;
    mapping(uint256 launchId => bool wasIndexed) public indexedLaunch;
    mapping(uint256 launchId => uint256 lastSequence) public lastSequence;
    mapping(uint256 launchId => address beneficiary) public beneficiaryOf;
    bool private entered;

    constructor(address portal_) {
        if (portal_ == address(0)) revert InvalidConfiguration();
        owner = msg.sender;
        portal = IFlapPortalFsi(portal_);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier nonReentrant() {
        if (entered) revert ReentrantCall();
        entered = true;
        _;
        entered = false;
    }

    function flapSharedIndexerSpecVersion() external pure returns (string memory) {
        return "fsi-v1";
    }

    function launchAndIndex(
        uint256 launchId,
        IFlapPortalFsi.NewTokenV6Params calldata params,
        string calldata metadataCid
    ) external payable onlyOwner returns (address token) {
        token = _launchAndIndex(launchId, params, metadataCid, msg.sender);
    }

    function _launchAndIndex(
        uint256 launchId,
        IFlapPortalFsi.NewTokenV6Params calldata params,
        string calldata metadataCid,
        address actor
    ) internal nonReentrant returns (address token) {
        if (
            launchId == 0 || indexedLaunch[launchId] || params.beneficiary == address(0)
                || bytes(metadataCid).length == 0 || bytes(metadataCid).length > MAX_DATA_BYTES
                || params.mktBps + params.deflationBps + params.dividendBps + params.lpBps != 10_000
        ) {
            if (indexedLaunch[launchId]) revert LaunchAlreadyIndexed();
            revert InvalidConfiguration();
        }

        bool nativeQuote = params.quoteToken == address(0);
        if (nativeQuote) {
            if (msg.value != params.quoteAmt) revert InvalidConfiguration();
        } else {
            if (msg.value != 0) revert InvalidConfiguration();
            if (params.quoteAmt > 0) {
                if (!IERC20WiredFlap(params.quoteToken).transferFrom(msg.sender, address(this), params.quoteAmt)) {
                    revert TransferFailed();
                }
                if (!IERC20WiredFlap(params.quoteToken).approve(address(portal), params.quoteAmt)) {
                    revert TransferFailed();
                }
            }
        }

        token = portal.newTokenV6{value: nativeQuote ? params.quoteAmt : 0}(params);
        if (token == address(0)) revert InvalidConfiguration();
        indexedLaunch[launchId] = true;
        beneficiaryOf[launchId] = params.beneficiary;
        emit FlapSharedIndexerFeed(
            NS_LAUNCH, launchId, 0, actor, params.beneficiary, block.timestamp, metadataCid
        );

        if (!nativeQuote && params.quoteAmt > 0) {
            if (!IERC20WiredFlap(params.quoteToken).approve(address(portal), 0)) revert TransferFailed();
            _transferBalance(params.quoteToken, msg.sender);
        }
        _transferBalance(token, msg.sender);
    }

    function appendLaunchUpdate(uint256 launchId, string calldata metadataCid) external onlyOwner {
        if (!indexedLaunch[launchId] || bytes(metadataCid).length == 0 || bytes(metadataCid).length > MAX_DATA_BYTES) {
            revert InvalidConfiguration();
        }
        uint256 seq = ++lastSequence[launchId];
        emit FlapSharedIndexerFeed(
            NS_LAUNCH, launchId, seq, msg.sender, beneficiaryOf[launchId], block.timestamp, metadataCid
        );
    }

    function _transferBalance(address token, address recipient) private {
        uint256 amount = IERC20WiredFlap(token).balanceOf(address(this));
        if (amount > 0 && !IERC20WiredFlap(token).transfer(recipient, amount)) revert TransferFailed();
    }

    receive() external payable {}
}
