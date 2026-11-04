// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title QuotaGrid
 * @notice Marketplace for AI API quota trading with on-chain escrow and settlement on Monad.
 */
abstract contract ReentrancyGuard {
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    error ReentrancyGuardReentrantCall();

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrancyGuardReentrantCall();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

contract QuotaGrid is ReentrancyGuard {
    enum Status {
        None,       // 0
        Open,       // 1
        Settled,    // 2
        Cancelled,  // 3
        Reclaimed   // 4
    }

    struct Listing {
        address seller;
        string provider;
        string model;
        uint256 pricePerKToken;
        uint256 quotaTotal;
        uint256 quotaUsed;
        uint256 quotaLocked;
        bool active;
        bytes encryptedKey;
    }

    struct Request {
        uint256 listingId;
        address buyer;
        uint256 tMax;
        uint256 deposit;
        bytes32 promptHash;
        uint64 openedAt;
        uint8 status;
        uint256 tUsed;
    }

    // --- State Variables ---
    address public owner;
    address public operator;
    uint16 public feeBps;
    uint64 public constant RECLAIM_DELAY = 600;
    uint256 public listingCount;
    uint256 public requestCount;
    mapping(address => uint256) public balances;
    uint256 public protocolFees;

    mapping(uint256 => Listing) private _listings;
    mapping(uint256 => Request) private _requests;

    // --- Events ---
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        string provider,
        string model,
        uint256 pricePerKToken,
        uint256 quota
    );
    event ListingUpdated(
        uint256 indexed listingId,
        uint256 pricePerKToken,
        uint256 quotaTotal,
        bool active
    );
    event RequestOpened(
        uint256 indexed requestId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 tMax,
        uint256 deposit,
        bytes32 promptHash
    );
    event RequestSettled(
        uint256 indexed requestId,
        uint256 tUsed,
        uint256 sellerPayout,
        uint256 fee,
        uint256 refund
    );
    event RequestCancelled(
        uint256 indexed requestId,
        uint256 refund
    );
    event Withdrawn(
        address indexed seller,
        uint256 amount
    );

    // --- Custom Errors ---
    error Unauthorized();
    error InvalidOperator();
    error InvalidFeeBps();
    error InvalidPrice();
    error InvalidQuota();
    error InvalidEncryptedKey();
    error ListingNotActive();
    error ListingNotFound();
    error RequestNotFound();
    error InsufficientTokens();
    error InsufficientAvailableQuota();
    error InsufficientDeposit();
    error RequestNotOpen();
    error TokenUsageExceedsMax();
    error ReclaimDelayNotMet();
    error NoBalanceToWithdraw();
    error TransferFailed();
    error ZeroAddress();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    modifier onlyOperator() {
        if (msg.sender != operator) revert Unauthorized();
        _;
    }

    constructor(address _operator, uint16 _feeBps) {
        if (_operator == address(0)) revert InvalidOperator();
        if (_feeBps > 1000) revert InvalidFeeBps();
        owner = msg.sender;
        operator = _operator;
        feeBps = _feeBps;
    }

    // --- Admin Functions ---
    function setOperator(address op) external onlyOwner {
        if (op == address(0)) revert InvalidOperator();
        operator = op;
    }

    function setFeeBps(uint16 bps) external onlyOwner {
        if (bps > 1000) revert InvalidFeeBps();
        feeBps = bps;
    }

    function withdrawFees(address to) external nonReentrant onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        uint256 amount = protocolFees;
        if (amount == 0) revert NoBalanceToWithdraw();
        protocolFees = 0;
        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // --- Views ---
    function getListing(uint256 id) external view returns (Listing memory) {
        Listing memory listing = _listings[id];
        if (listing.seller == address(0)) revert ListingNotFound();
        return listing;
    }

    function getRequest(uint256 id) external view returns (Request memory) {
        Request memory req = _requests[id];
        if (req.buyer == address(0)) revert RequestNotFound();
        return req;
    }

    function quote(uint256 listingId, uint256 tokens) public view returns (uint256) {
        Listing storage listing = _listings[listingId];
        if (listing.seller == address(0)) revert ListingNotFound();
        if (tokens == 0) return 0;
        return (tokens * listing.pricePerKToken + 999) / 1000;
    }

    function available(uint256 listingId) public view returns (uint256) {
        Listing storage listing = _listings[listingId];
        if (listing.seller == address(0)) revert ListingNotFound();
        return listing.quotaTotal - listing.quotaUsed - listing.quotaLocked;
    }

    // --- Core Marketplace Functions ---
    function createListing(
        string calldata provider,
        string calldata model,
        uint256 pricePerKToken,
        uint256 quota,
        bytes calldata encryptedKey
    ) external returns (uint256) {
        if (pricePerKToken == 0) revert InvalidPrice();
        if (quota == 0) revert InvalidQuota();
        if (encryptedKey.length == 0) revert InvalidEncryptedKey();

        uint256 id = ++listingCount;
        _listings[id] = Listing({
            seller: msg.sender,
            provider: provider,
            model: model,
            pricePerKToken: pricePerKToken,
            quotaTotal: quota,
            quotaUsed: 0,
            quotaLocked: 0,
            active: true,
            encryptedKey: encryptedKey
        });

        emit ListingCreated(id, msg.sender, provider, model, pricePerKToken, quota);
        return id;
    }

    function updateListing(
        uint256 id,
        uint256 pricePerKToken,
        uint256 addQuota,
        bool active
    ) external {
        Listing storage listing = _listings[id];
        if (listing.seller == address(0)) revert ListingNotFound();
        if (listing.seller != msg.sender) revert Unauthorized();
        if (pricePerKToken == 0) revert InvalidPrice();

        listing.pricePerKToken = pricePerKToken;
        listing.quotaTotal += addQuota;
        listing.active = active;

        emit ListingUpdated(id, pricePerKToken, listing.quotaTotal, active);
    }

    function openRequest(
        uint256 listingId,
        uint256 tMax,
        bytes32 promptHash
    ) external payable returns (uint256) {
        Listing storage listing = _listings[listingId];
        if (listing.seller == address(0)) revert ListingNotFound();
        if (!listing.active) revert ListingNotActive();
        if (tMax == 0) revert InsufficientTokens();
        if (available(listingId) < tMax) revert InsufficientAvailableQuota();

        uint256 reqCost = quote(listingId, tMax);
        if (msg.value < reqCost) revert InsufficientDeposit();

        listing.quotaLocked += tMax;

        uint256 id = ++requestCount;
        // forge-lint: disable-next-line(unsafe-typecast)
        _requests[id] = Request({
            listingId: listingId,
            buyer: msg.sender,
            tMax: tMax,
            deposit: msg.value,
            promptHash: promptHash,
            openedAt: uint64(block.timestamp),
            status: uint8(Status.Open),
            tUsed: 0
        });

        emit RequestOpened(id, listingId, msg.sender, tMax, msg.value, promptHash);
        return id;
    }

    function settle(uint256 requestId, uint256 tUsed) external nonReentrant onlyOperator {
        Request storage req = _requests[requestId];
        if (req.buyer == address(0)) revert RequestNotFound();
        if (req.status != uint8(Status.Open)) revert RequestNotOpen();
        if (tUsed > req.tMax) revert TokenUsageExceedsMax();

        req.status = uint8(Status.Settled);
        req.tUsed = tUsed;

        uint256 listingId = req.listingId;
        Listing storage listing = _listings[listingId];

        uint256 costUsed = quote(listingId, tUsed);
        uint256 fee = (costUsed * feeBps) / 10000;
        uint256 sellerPayout = costUsed - fee;

        balances[listing.seller] += sellerPayout;
        protocolFees += fee;

        listing.quotaLocked -= req.tMax;
        listing.quotaUsed += tUsed;

        uint256 refund = req.deposit - costUsed;

        emit RequestSettled(requestId, tUsed, sellerPayout, fee, refund);

        if (refund > 0) {
            (bool success, ) = req.buyer.call{value: refund}("");
            if (!success) {
                balances[req.buyer] += refund;
            }
        }
    }

    function cancel(uint256 requestId) external nonReentrant onlyOperator {
        Request storage req = _requests[requestId];
        if (req.buyer == address(0)) revert RequestNotFound();
        if (req.status != uint8(Status.Open)) revert RequestNotOpen();

        req.status = uint8(Status.Cancelled);

        _listings[req.listingId].quotaLocked -= req.tMax;

        uint256 refund = req.deposit;

        emit RequestCancelled(requestId, refund);

        if (refund > 0) {
            (bool success, ) = req.buyer.call{value: refund}("");
            if (!success) {
                balances[req.buyer] += refund;
            }
        }
    }

    function reclaim(uint256 requestId) external nonReentrant {
        Request storage req = _requests[requestId];
        if (req.buyer == address(0)) revert RequestNotFound();
        if (msg.sender != req.buyer) revert Unauthorized();
        if (req.status != uint8(Status.Open)) revert RequestNotOpen();
        if (block.timestamp < req.openedAt + RECLAIM_DELAY) revert ReclaimDelayNotMet();

        req.status = uint8(Status.Reclaimed);

        _listings[req.listingId].quotaLocked -= req.tMax;

        uint256 refund = req.deposit;

        emit RequestCancelled(requestId, refund);

        if (refund > 0) {
            (bool success, ) = req.buyer.call{value: refund}("");
            if (!success) {
                balances[req.buyer] += refund;
            }
        }
    }

    function withdraw() external nonReentrant {
        uint256 amount = balances[msg.sender];
        if (amount == 0) revert NoBalanceToWithdraw();
        balances[msg.sender] = 0;

        emit Withdrawn(msg.sender, amount);

        (bool success, ) = msg.sender.call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
