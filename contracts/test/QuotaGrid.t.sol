// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {QuotaGrid} from "../src/QuotaGrid.sol";

contract RevertingBuyer {
    QuotaGrid public immutable grid;

    constructor(QuotaGrid _grid) {
        grid = _grid;
    }

    function open(uint256 listingId, uint256 tMax, bytes32 promptHash) external payable returns (uint256) {
        return grid.openRequest{value: msg.value}(listingId, tMax, promptHash);
    }

    function withdraw() external {
        grid.withdraw();
    }

    // Explicitly reject ETH
    receive() external payable {
        revert("I refuse ETH");
    }
}

contract ReenteringBuyer {
    QuotaGrid public immutable grid;
    bool public shouldReenter;
    uint256 public targetRequestId;

    constructor(QuotaGrid _grid) {
        grid = _grid;
    }

    function open(uint256 listingId, uint256 tMax, bytes32 promptHash) external payable returns (uint256) {
        return grid.openRequest{value: msg.value}(listingId, tMax, promptHash);
    }

    function setReenter(bool _shouldReenter, uint256 _targetRequestId) external {
        shouldReenter = _shouldReenter;
        targetRequestId = _targetRequestId;
    }

    receive() external payable {
        if (shouldReenter) {
            shouldReenter = false;
            grid.withdraw();
        }
    }
}

contract QuotaGridTest is Test {
    QuotaGrid public grid;

    address public owner = address(0xA1);
    address public operator = address(0xB1);
    address public seller = address(0xC1);
    address public buyer = address(0xD1);
    address public stranger = address(0xE1);

    uint16 public constant INITIAL_FEE_BPS = 250; // 2.5%

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

    function setUp() public {
        vm.prank(owner);
        grid = new QuotaGrid(operator, INITIAL_FEE_BPS);

        vm.deal(seller, 100 ether);
        vm.deal(buyer, 100 ether);
        vm.deal(stranger, 100 ether);
    }

    // ---------------------------------------------------------------
    // 1. Initial State & Constructor
    // ---------------------------------------------------------------
    function test_InitialState() public view {
        assertEq(grid.owner(), owner);
        assertEq(grid.operator(), operator);
        assertEq(grid.feeBps(), INITIAL_FEE_BPS);
        assertEq(grid.RECLAIM_DELAY(), 600);
        assertEq(grid.listingCount(), 0);
        assertEq(grid.requestCount(), 0);
        assertEq(grid.protocolFees(), 0);
    }

    function test_ConstructorGuards() public {
        vm.expectRevert(QuotaGrid.InvalidOperator.selector);
        new QuotaGrid(address(0), 250);

        vm.expectRevert(QuotaGrid.InvalidFeeBps.selector);
        new QuotaGrid(operator, 1001);
    }

    // ---------------------------------------------------------------
    // 2. Listing Creation & Update Guards
    // ---------------------------------------------------------------
    function test_CreateListingGuards() public {
        vm.startPrank(seller);

        // Price zero
        vm.expectRevert(QuotaGrid.InvalidPrice.selector);
        grid.createListing("openai", "gpt-4o", 0, 1000, hex"abcd");

        // Quota zero
        vm.expectRevert(QuotaGrid.InvalidQuota.selector);
        grid.createListing("openai", "gpt-4o", 1000, 0, hex"abcd");

        // Empty key
        vm.expectRevert(QuotaGrid.InvalidEncryptedKey.selector);
        grid.createListing("openai", "gpt-4o", 1000, 1000, "");

        // Valid listing
        vm.expectEmit(true, true, false, true);
        emit ListingCreated(1, seller, "openai", "gpt-4o", 500, 10000);
        uint256 id = grid.createListing("openai", "gpt-4o", 500, 10000, hex"1234");
        assertEq(id, 1);
        assertEq(grid.listingCount(), 1);

        QuotaGrid.Listing memory l = grid.getListing(1);
        assertEq(l.seller, seller);
        assertEq(l.provider, "openai");
        assertEq(l.model, "gpt-4o");
        assertEq(l.pricePerKToken, 500);
        assertEq(l.quotaTotal, 10000);
        assertEq(l.quotaUsed, 0);
        assertEq(l.quotaLocked, 0);
        assertTrue(l.active);
        assertEq(l.encryptedKey, hex"1234");

        vm.stopPrank();
    }

    function test_UpdateListingGuards() public {
        vm.prank(seller);
        uint256 id = grid.createListing("anthropic", "claude-3-5", 1000, 5000, hex"aabb");

        // Non-existent listing
        vm.prank(seller);
        vm.expectRevert(QuotaGrid.ListingNotFound.selector);
        grid.updateListing(999, 1000, 500, true);

        // Unauthorized (not seller)
        vm.prank(stranger);
        vm.expectRevert(QuotaGrid.Unauthorized.selector);
        grid.updateListing(id, 1200, 500, true);

        // Price zero
        vm.prank(seller);
        vm.expectRevert(QuotaGrid.InvalidPrice.selector);
        grid.updateListing(id, 0, 500, true);

        // Valid update
        vm.prank(seller);
        vm.expectEmit(true, false, false, true);
        emit ListingUpdated(id, 1500, 7000, false);
        grid.updateListing(id, 1500, 2000, false);

        QuotaGrid.Listing memory updated = grid.getListing(id);
        assertEq(updated.pricePerKToken, 1500);
        assertEq(updated.quotaTotal, 7000);
        assertFalse(updated.active);
    }

    // ---------------------------------------------------------------
    // 3. Quote Rounding Up
    // ---------------------------------------------------------------
    function test_QuoteRoundingUp() public {
        vm.prank(seller);
        uint256 id = grid.createListing("google", "gemini-2.0-flash", 1000, 100000, hex"ccdd");

        // 0 tokens -> 0
        assertEq(grid.quote(id, 0), 0);

        // 1 token at 1000/kToken -> ceil(1000/1000) = 1
        assertEq(grid.quote(id, 1), 1);

        // 500 tokens at 1000/kToken -> ceil(500,000/1000) = 500
        assertEq(grid.quote(id, 500), 500);

        // 1000 tokens at 1000/kToken -> 1000
        assertEq(grid.quote(id, 1000), 1000);

        // 1001 tokens at 1000/kToken -> ceil(1001000/1000) = 1001
        assertEq(grid.quote(id, 1001), 1001);

        // Create listing with price = 1 wei per 1k tokens
        vm.prank(seller);
        uint256 idCheap = grid.createListing("cheap", "model", 1, 100000, hex"eeff");

        // 1 token at 1 wei / 1k tokens -> ceil(1/1000) = 1 wei
        assertEq(grid.quote(idCheap, 1), 1);
        // 999 tokens at 1 wei / 1k tokens -> ceil(999/1000) = 1 wei
        assertEq(grid.quote(idCheap, 999), 1);
        // 1000 tokens -> 1 wei
        assertEq(grid.quote(idCheap, 1000), 1);
        // 1001 tokens -> ceil(1001/1000) = 2 wei
        assertEq(grid.quote(idCheap, 1001), 2);

        // Non-existent listing
        vm.expectRevert(QuotaGrid.ListingNotFound.selector);
        grid.quote(999, 100);
    }

    // ---------------------------------------------------------------
    // 4. OpenRequest: Locks quota, validates value/quota/active
    // ---------------------------------------------------------------
    function test_OpenRequestGuardsAndLocking() public {
        vm.prank(seller);
        uint256 id = grid.createListing("google", "gemini-pro", 1 ether, 1000, hex"abcd");

        bytes32 promptHash = keccak256("hello");

        // tMax == 0
        vm.startPrank(buyer);
        vm.expectRevert(QuotaGrid.InsufficientTokens.selector);
        grid.openRequest{value: 1 ether}(id, 0, promptHash);

        // Insufficient value
        uint256 cost = grid.quote(id, 500); // 500 * 1 ether / 1000 = 0.5 ether
        assertEq(cost, 0.5 ether);
        vm.expectRevert(QuotaGrid.InsufficientDeposit.selector);
        grid.openRequest{value: 0.5 ether - 1}(id, 500, promptHash);

        // Insufficient available quota
        vm.expectRevert(QuotaGrid.InsufficientAvailableQuota.selector);
        grid.openRequest{value: 2 ether}(id, 1001, promptHash);

        // Inactive listing
        vm.stopPrank();
        vm.prank(seller);
        grid.updateListing(id, 1 ether, 0, false);

        vm.prank(buyer);
        vm.expectRevert(QuotaGrid.ListingNotActive.selector);
        grid.openRequest{value: 1 ether}(id, 500, promptHash);

        // Reactivate listing
        vm.prank(seller);
        grid.updateListing(id, 1 ether, 0, true);

        // Successful open
        vm.prank(buyer);
        vm.expectEmit(true, true, true, true);
        emit RequestOpened(1, id, buyer, 500, 0.5 ether, promptHash);
        uint256 reqId = grid.openRequest{value: 0.5 ether}(id, 500, promptHash);
        assertEq(reqId, 1);

        // Check quota locked
        QuotaGrid.Listing memory l = grid.getListing(id);
        assertEq(l.quotaLocked, 500);
        assertEq(l.quotaUsed, 0);
        assertEq(grid.available(id), 500);

        // Check request struct
        QuotaGrid.Request memory req = grid.getRequest(reqId);
        assertEq(req.listingId, id);
        assertEq(req.buyer, buyer);
        assertEq(req.tMax, 500);
        assertEq(req.deposit, 0.5 ether);
        assertEq(req.promptHash, promptHash);
        assertEq(req.openedAt, block.timestamp);
        assertEq(req.status, 1); // Status.Open
        assertEq(req.tUsed, 0);
    }

    // ---------------------------------------------------------------
    // 5. Two Requests Cannot Oversubscribe Quota
    // ---------------------------------------------------------------
    function test_TwoRequestsCannotOversubscribe() public {
        vm.prank(seller);
        uint256 id = grid.createListing("openai", "gpt-4o", 1 ether, 1000, hex"abcd");

        bytes32 promptHash = keccak256("test");

        // Request 1 locks 600 quota
        vm.prank(buyer);
        grid.openRequest{value: 0.6 ether}(id, 600, promptHash);
        assertEq(grid.available(id), 400);

        // Request 2 requests 500 quota -> must revert
        vm.prank(buyer);
        vm.expectRevert(QuotaGrid.InsufficientAvailableQuota.selector);
        grid.openRequest{value: 0.5 ether}(id, 500, promptHash);

        // Request 2 requests remaining 400 quota -> succeeds
        vm.prank(buyer);
        grid.openRequest{value: 0.4 ether}(id, 400, promptHash);
        assertEq(grid.available(id), 0);

        // Request 3 requests 1 quota -> must revert
        vm.prank(buyer);
        vm.expectRevert(QuotaGrid.InsufficientAvailableQuota.selector);
        grid.openRequest{value: 0.001 ether}(id, 1, promptHash);
    }

    // ---------------------------------------------------------------
    // 6. Settle: Exact payouts, fee, refund, quota accounting
    // ---------------------------------------------------------------
    function test_SettleAccounting() public {
        vm.prank(seller);
        // 1000 wei per 1k tokens = 1 wei per token
        uint256 id = grid.createListing("openai", "gpt-4o", 1000, 10000, hex"abcd");

        uint256 tMax = 1000;
        uint256 costMax = grid.quote(id, tMax); // 1000 wei
        assertEq(costMax, 1000);

        vm.prank(buyer);
        uint256 reqId = grid.openRequest{value: 1000}(id, tMax, keccak256("p"));

        uint256 buyerBalanceBefore = buyer.balance;

        // Settle with tUsed = 600
        uint256 tUsed = 600;
        uint256 costUsed = grid.quote(id, tUsed); // 600 wei
        assertEq(costUsed, 600);

        // fee = 600 * 250 / 10000 = 15 wei
        uint256 expectedFee = (costUsed * INITIAL_FEE_BPS) / 10000;
        assertEq(expectedFee, 15);
        uint256 expectedSellerPayout = costUsed - expectedFee; // 585 wei
        uint256 expectedRefund = 1000 - costUsed; // 400 wei

        vm.prank(operator);
        vm.expectEmit(true, false, false, true);
        emit RequestSettled(reqId, tUsed, expectedSellerPayout, expectedFee, expectedRefund);
        grid.settle(reqId, tUsed);

        // Assert balances and protocol fees
        assertEq(grid.balances(seller), expectedSellerPayout);
        assertEq(grid.protocolFees(), expectedFee);
        assertEq(buyer.balance, buyerBalanceBefore + expectedRefund);

        // Assert quota accounting: quotaLocked - 1000, quotaUsed + 600
        QuotaGrid.Listing memory l = grid.getListing(id);
        assertEq(l.quotaLocked, 0);
        assertEq(l.quotaUsed, 600);
        assertEq(grid.available(id), 10000 - 600);

        // Assert request status and tUsed
        QuotaGrid.Request memory req = grid.getRequest(reqId);
        assertEq(req.status, 2); // Status.Settled
        assertEq(req.tUsed, 600);
    }

    // ---------------------------------------------------------------
    // 7. Excess msg.value is Refunded at Settle
    // ---------------------------------------------------------------
    function test_ExcessMsgValueRefundedAtSettle() public {
        vm.prank(seller);
        uint256 id = grid.createListing("openai", "gpt-4o", 1000, 10000, hex"abcd");

        uint256 tMax = 1000;
        uint256 minCost = grid.quote(id, tMax); // 1000 wei
        assertEq(minCost, 1000);
        uint256 excessDeposit = 5000 wei; // Buyer deposits 5000 wei

        vm.prank(buyer);
        uint256 reqId = grid.openRequest{value: excessDeposit}(id, tMax, keccak256("excess"));

        uint256 buyerBalanceBefore = buyer.balance;

        // Fully used tUsed = 1000
        vm.prank(operator);
        grid.settle(reqId, 1000);

        // Buyer should get back excess: 5000 - 1000 = 4000 wei
        assertEq(buyer.balance - buyerBalanceBefore, 4000 wei);
    }

    // ---------------------------------------------------------------
    // 8. Settle Revert Conditions
    // ---------------------------------------------------------------
    function test_SettleReverts() public {
        vm.prank(seller);
        uint256 id = grid.createListing("openai", "gpt-4o", 1000, 10000, hex"abcd");

        vm.prank(buyer);
        uint256 reqId = grid.openRequest{value: 1000}(id, 1000, keccak256("p"));

        // Non-operator settle reverts
        vm.prank(stranger);
        vm.expectRevert(QuotaGrid.Unauthorized.selector);
        grid.settle(reqId, 500);

        // tUsed > tMax reverts
        vm.prank(operator);
        vm.expectRevert(QuotaGrid.TokenUsageExceedsMax.selector);
        grid.settle(reqId, 1001);

        // Valid settle
        vm.prank(operator);
        grid.settle(reqId, 500);

        // Double settle reverts
        vm.prank(operator);
        vm.expectRevert(QuotaGrid.RequestNotOpen.selector);
        grid.settle(reqId, 500);
    }

    // ---------------------------------------------------------------
    // 9. Cancel Refunds 100% and Unlocks Quota
    // ---------------------------------------------------------------
    function test_CancelRefunds100Percent() public {
        vm.prank(seller);
        uint256 id = grid.createListing("openai", "gpt-4o", 1000, 10000, hex"abcd");

        vm.prank(buyer);
        uint256 reqId = grid.openRequest{value: 2000}(id, 1000, keccak256("c"));

        uint256 buyerBalBefore = buyer.balance;

        // Non-operator cannot cancel
        vm.prank(buyer);
        vm.expectRevert(QuotaGrid.Unauthorized.selector);
        grid.cancel(reqId);

        // Operator cancels
        vm.prank(operator);
        vm.expectEmit(true, false, false, true);
        emit RequestCancelled(reqId, 2000);
        grid.cancel(reqId);

        assertEq(buyer.balance, buyerBalBefore + 2000);

        QuotaGrid.Listing memory l = grid.getListing(id);
        assertEq(l.quotaLocked, 0);
        assertEq(grid.available(id), 10000);

        QuotaGrid.Request memory req = grid.getRequest(reqId);
        assertEq(req.status, 3); // Status.Cancelled

        // Cannot cancel again
        vm.prank(operator);
        vm.expectRevert(QuotaGrid.RequestNotOpen.selector);
        grid.cancel(reqId);
    }

    // ---------------------------------------------------------------
    // 10. Reclaim Timing & Authorization
    // ---------------------------------------------------------------
    function test_ReclaimDelayGuards() public {
        vm.prank(seller);
        uint256 id = grid.createListing("openai", "gpt-4o", 1000, 10000, hex"abcd");

        vm.prank(buyer);
        uint256 reqId = grid.openRequest{value: 1000}(id, 1000, keccak256("r"));

        uint256 openedAt = block.timestamp;

        // Non-buyer cannot reclaim
        vm.prank(stranger);
        vm.expectRevert(QuotaGrid.Unauthorized.selector);
        grid.reclaim(reqId);

        // Before RECLAIM_DELAY (e.g. 599s)
        vm.warp(openedAt + 599);
        vm.prank(buyer);
        vm.expectRevert(QuotaGrid.ReclaimDelayNotMet.selector);
        grid.reclaim(reqId);

        // At openedAt + 600s
        vm.warp(openedAt + 600);
        uint256 buyerBalBefore = buyer.balance;

        vm.prank(buyer);
        vm.expectEmit(true, false, false, true);
        emit RequestCancelled(reqId, 1000);
        grid.reclaim(reqId);

        assertEq(buyer.balance, buyerBalBefore + 1000);

        QuotaGrid.Listing memory l = grid.getListing(id);
        assertEq(l.quotaLocked, 0);
        assertEq(grid.available(id), 10000);

        QuotaGrid.Request memory req = grid.getRequest(reqId);
        assertEq(req.status, 4); // Status.Reclaimed

        // Cannot reclaim again
        vm.prank(buyer);
        vm.expectRevert(QuotaGrid.RequestNotOpen.selector);
        grid.reclaim(reqId);
    }

    // ---------------------------------------------------------------
    // 11. Reverting-Contract Buyer Credits Balances Instead of Reverting
    // ---------------------------------------------------------------
    function test_RevertingBuyerCreditsBalances() public {
        RevertingBuyer reb = new RevertingBuyer(grid);
        vm.deal(address(reb), 10 ether);

        vm.prank(seller);
        uint256 id = grid.createListing("openai", "gpt-4o", 1000, 10000, hex"abcd");

        // Contract buyer opens request
        uint256 reqId = reb.open{value: 2000}(id, 1000, keccak256("reb"));

        // Settle with tUsed = 500, refund = 1500 wei
        // reb rejects ETH, so grid should catch and credit balances[reb]
        vm.prank(operator);
        grid.settle(reqId, 500);

        assertEq(grid.balances(address(reb)), 1500);

        // Test with cancel for another request
        uint256 reqId2 = reb.open{value: 2000}(id, 1000, keccak256("reb2"));
        vm.prank(operator);
        grid.cancel(reqId2);

        assertEq(grid.balances(address(reb)), 1500 + 2000);
    }

    // ---------------------------------------------------------------
    // 12. Withdraw, WithdrawFees, and setFeeBps Cap
    // ---------------------------------------------------------------
    function test_WithdrawAndWithdrawFees() public {
        vm.prank(seller);
        uint256 id = grid.createListing("openai", "gpt-4o", 1 ether, 1000, hex"abcd");

        vm.prank(buyer);
        uint256 reqId = grid.openRequest{value: 1 ether}(id, 1000, keccak256("p"));

        vm.prank(operator);
        grid.settle(reqId, 1000); // 1 ether cost, 0.025 ether fee, 0.975 ether seller

        uint256 sellerCredit = grid.balances(seller);
        assertEq(sellerCredit, 0.975 ether);
        uint256 fees = grid.protocolFees();
        assertEq(fees, 0.025 ether);

        // Seller withdraw
        uint256 sellerBalBefore = seller.balance;
        vm.prank(seller);
        vm.expectEmit(true, false, false, true);
        emit Withdrawn(seller, sellerCredit);
        grid.withdraw();

        assertEq(seller.balance, sellerBalBefore + sellerCredit);
        assertEq(grid.balances(seller), 0);

        // Double withdraw reverts
        vm.prank(seller);
        vm.expectRevert(QuotaGrid.NoBalanceToWithdraw.selector);
        grid.withdraw();

        // WithdrawFees guards
        address feeCollector = address(0xFEE);

        // Unauthorized
        vm.prank(stranger);
        vm.expectRevert(QuotaGrid.Unauthorized.selector);
        grid.withdrawFees(feeCollector);

        // Zero address
        vm.prank(owner);
        vm.expectRevert(QuotaGrid.ZeroAddress.selector);
        grid.withdrawFees(address(0));

        // Successful withdrawFees
        vm.prank(owner);
        grid.withdrawFees(feeCollector);
        assertEq(feeCollector.balance, fees);
        assertEq(grid.protocolFees(), 0);

        // WithdrawFees with 0 fee reverts
        vm.prank(owner);
        vm.expectRevert(QuotaGrid.NoBalanceToWithdraw.selector);
        grid.withdrawFees(feeCollector);
    }

    function test_AdminSetFeeBpsAndOperatorGuards() public {
        // FeeBps cap (max 1000)
        vm.prank(owner);
        vm.expectRevert(QuotaGrid.InvalidFeeBps.selector);
        grid.setFeeBps(1001);

        // Set fee <= 1000 by owner
        vm.prank(owner);
        grid.setFeeBps(1000);
        assertEq(grid.feeBps(), 1000);

        // Set fee by non-owner reverts
        vm.prank(stranger);
        vm.expectRevert(QuotaGrid.Unauthorized.selector);
        grid.setFeeBps(500);

        // Set operator by non-owner reverts
        vm.prank(stranger);
        vm.expectRevert(QuotaGrid.Unauthorized.selector);
        grid.setOperator(stranger);

        // Set operator zero address reverts
        vm.prank(owner);
        vm.expectRevert(QuotaGrid.InvalidOperator.selector);
        grid.setOperator(address(0));

        // Valid operator update
        vm.prank(owner);
        grid.setOperator(stranger);
        assertEq(grid.operator(), stranger);
    }

    // ---------------------------------------------------------------
    // 13. Reentrancy Protection
    // ---------------------------------------------------------------
    function test_ReentrancyProtectionOnWithdraw() public {
        ReenteringBuyer rb = new ReenteringBuyer(grid);
        vm.deal(address(rb), 10 ether);

        vm.prank(seller);
        uint256 id = grid.createListing("openai", "gpt-4o", 1000, 10000, hex"abcd");

        // Buyer opens request
        uint256 reqId = rb.open{value: 2000}(id, 1000, keccak256("reenter"));

        // Settle sends refund of 1000 wei to rb
        // In receive(), rb tries to call grid.withdraw() -> ReentrancyGuardReentrantCall
        // Since settle uses (bool success, ) = buyer.call, the call fails and refund is credited to balances[rb]!
        rb.setReenter(true, reqId);
        vm.prank(operator);
        grid.settle(reqId, 1000);

        // Refund fell back to balances
        assertEq(grid.balances(address(rb)), 1000);
    }

    // ---------------------------------------------------------------
    // 14. Fuzz Test: For any tUsed <= tMax, sellerCredit + fee + refund == deposit
    // ---------------------------------------------------------------
    function testFuzz_SettlementConservation(
        uint256 pricePerKToken,
        uint256 tMax,
        uint256 tUsed,
        uint16 feeBps,
        uint256 excessDeposit
    ) public {
        // Bound inputs to realistic and non-overflow ranges
        pricePerKToken = bound(pricePerKToken, 1, 1_000_000 ether);
        tMax = bound(tMax, 1, 10_000_000);
        tUsed = bound(tUsed, 0, tMax);
        feeBps = uint16(bound(feeBps, 0, 1000));
        excessDeposit = bound(excessDeposit, 0, 10 ether);

        // Update feeBps
        vm.prank(owner);
        grid.setFeeBps(feeBps);

        // Create listing with price and large quota
        vm.prank(seller);
        uint256 id = grid.createListing("fuzz", "model", pricePerKToken, tMax + 100, hex"abcd");

        // Minimum required deposit
        uint256 minDeposit = grid.quote(id, tMax);
        uint256 deposit = minDeposit + excessDeposit;

        vm.deal(buyer, deposit);
        vm.prank(buyer);
        uint256 reqId = grid.openRequest{value: deposit}(id, tMax, keccak256("fuzz"));

        uint256 sellerBalBefore = grid.balances(seller);
        uint256 feesBefore = grid.protocolFees();
        uint256 buyerEthBefore = buyer.balance;

        vm.prank(operator);
        grid.settle(reqId, tUsed);

        uint256 sellerCredit = grid.balances(seller) - sellerBalBefore;
        uint256 fee = grid.protocolFees() - feesBefore;
        uint256 refund = buyer.balance - buyerEthBefore;

        // Exact conservation: sellerCredit + fee + refund == deposit
        assertEq(
            sellerCredit + fee + refund,
            deposit,
            "sellerCredit + fee + refund must exactly equal deposit"
        );
    }
}
