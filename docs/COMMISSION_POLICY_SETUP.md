# Commission Policy Setup

This system implements the policy as governance, not as an editable spreadsheet pretending history never happened.

## Locked defaults

- SHOP client: 70% Independent Barber / 30% Shop
- Verified pre-existing client: 100% Independent Barber
- Tips: 100% Independent Barber, outside Commission Basis
- Default attribution: SHOP
- Walk-ins: SHOP
- Attribution dispute window: 24 hours
- Volume flag: more than 40% of new clients claimed pre-existing
- Settlement week: Monday through Sunday, America/New_York
- Statement issued Monday
- Effective date: January 6, 2026
- Manual owner settlement by Zelle or cash
- Locked lines immutable; corrections by Adjustment

## Proposed rules

The admin Policy Approval area lists evidence standards, roster window, persistence, discounts, promotions, deposits, no-show/cancellation treatment, refunds, redemption, rounding, statement lock, settlement day, notice, and retention. Proposed terms do not become active merely because they appear in code.

## Owner workflow

1. Review rule and legal/operational impact.
2. Approve, reject, or edit the future value.
3. Record initials/acknowledgement and effective date.
4. Publish a new version.
5. Notify affected Independent Barbers.
6. Collect acknowledgement.
7. Apply only to transactions on/after effective date.

## Calculation setup

Map Square service lines, add-ons, tips, discounts, refunds, chargebacks, gift/package/membership redemption, deposits, and products. Values are integer cents. Rates are converted to integer basis points for line-level half-up rounding. Unresolved product, fee, deposit, and redemption values stop for review.

## Statements, disputes, and adjustments

Generate weekly itemized Statements. A locked line is never updated or deleted. Upheld disputes after lock create a separate Adjustment with reason, author, timestamp, evidence, and related line.

## Legal warning

The attached policy itself flags an unresolved worker-classification conflict between booth rental and percentage commission. This system does not resolve that legal question. Owner and qualified counsel must determine the operating structure and agreements before the first production Statement.
