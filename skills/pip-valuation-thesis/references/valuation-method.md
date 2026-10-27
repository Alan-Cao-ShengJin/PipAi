# Valuation mechanics and limits

## Match the claim and cash flows

For a nonfinancial corporate issuer, an FCFE bridge may start from attributable net income, add relevant noncash charges, deduct capex and increases in noncash working capital, and include net borrowing/repayment and other claims as appropriate. Validate the issuer-specific bridge. FCFF belongs with a firm-level discount rate and an enterprise-to-equity bridge; FCFE belongs with a cost of equity. See [Damodaran's cash-flow lecture](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/dcfinput.html).

Neither net income nor operating cash flow alone is generally distributable equity cash flow. Avoid double counting SBC add-backs while ignoring dilution, cash settlement or repurchase costs. A growing terminal business also needs an economically coherent reinvestment and financing assumption.

Lower assumed cash conversion lowers value for the same profit path. At a fixed observed price, it generally requires a stronger earnings path or another changed assumption to make the valuation fit; it does not justify mechanically lowering the implied required terminal profit. Distinguish changing the inferred requirement from lowering the analyst's estimate of what the business can achieve.

## Included calculator

`scripts/reverse-dcf.mjs` is a small, dependency-free FCFE sensitivity helper, not the complete analyst model. Run with Node 24 or later:

```powershell
node skills/pip-valuation-thesis/scripts/reverse-dcf.mjs skills/pip-valuation-thesis/references/fcfe-example.json
```

The example is synthetic. Inputs state equity value, currency/scale, explicit forecast FCFE, cost of equity in percentage points, terminal growth in percentage points and transition years. `10` means 10 percent, not `0.10`. No calendar year or discount-rate grid is inferred from the current date.

At explicit year K, the final forecast FCFE must be positive for this helper's geometric transition. Over N subsequent years it transitions to unknown steady-year FCFE S. At T=K+N, terminal value is `S * (1+g) / (r-g)`; the first terminal cash flow is at T+1. The helper discounts the explicit flows, transition flows and terminal value once each. It solves S only for a bracketed nonnegative root and checks forward value against the target.

The helper permits earlier negative explicit cash flows but cannot represent a nonpositive final cash flow with its chosen transition. Use an explicit cash-flow model for turnarounds, finite-life assets or other incompatible cases. It does not estimate probabilities, select rates, choose terminal reinvestment, calculate an enterprise/equity bridge or recommend trades.

## Interpretation checks

- Price x relevant share count reconciles to the stated equity basis and currency; take share-class and dilution differences seriously.
- Forecast and market inputs share the same information cutoff and reporting periods.
- Numerical forward/reverse agreement tests arithmetic, not the reasonableness of inputs.
- Compare scenarios on the same fiscal anchor and terminal timing. Different terminal horizons/rates can change an inferred requirement without new business evidence.
- A fitted profit/cash-flow target outside plausible scenarios is a sign to reassess assumptions, not evidence that the target will be achieved.
- A perpetual linked to a share/index/commodity needs separate basis, funding, oracle and margin analysis; a cash-market valuation cannot be copied into a trade return unchanged.
