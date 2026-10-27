# Research skills review and redesign

Reviewed: **27 October 2026, Singapore**. Canonical cleaned bundle: [skills/](../skills/README.md). Original collection: local `Claude Skills/`, comprising ten skill entry points and sixty files including references/scripts/templates. All originals are preserved; their SHA-256 inventory is [recorded separately](../skills/source-inventory.json).

## Finding

The collection contains a strong issuer-model workflow: cumulative-to-quarter actuals, operating-data reconciliation, transcript fact-checking, driver forecasts, consensus-gap decomposition, financial-quality analysis and concise manager communication. Two deeper analysis skills contribute reverse valuation and narrative/financial cross-checks.

It is not yet a complete investment research cycle. It primarily updates one company's model or produces a report. It lacks a shared evidence contract, general asset routing, strategy validation, independent challenge, portfolio construction, active-monitor acknowledgement and outcome learning. Some rules conflict with each other and with Pip's source-aware, proactive, cross-asset mandate.

The redesign creates twelve focused skills, supporting references, a dependency-aware catalog, a common handoff contract and small numerical/validation helpers. The primary analyst sequence is model-first; wider strategy/portfolio work is a downstream extension. It preserves useful specialist techniques while separating company/audience preferences from universal methodology.

## Source-to-bundle mapping

| Original skill | Treatment |
| --- | --- |
| company-model-update | Replaced as coordinator by pip-research-cycle; company update remains an entry mode |
| quarterly-3s | Incorporated into company-model actuals; preserve derivation provenance and distinguish flows, stocks and per-share amounts |
| volume-data-tab | Incorporated into operating-driver reference; retain raw observations and investigate residuals rather than force identities |
| earnings-call-guidance | Incorporated into guidance reference; preserve qualifiers and uncertain corrections, avoid treating management assurances as independent truth |
| revenue-projection-build | Incorporated into forecast/audit reference; remove KPI-driven cost caps and unconditional run-rate/zero-item rules |
| penetrate-financial-report-v2 | Financial-quality specialist with scoped model-audit and later thesis-validation passes; dedicated cash-flow/financing work |
| penetrate-narrative-stock-analysis | Valuation/expectations after the model audit; produces a provisional thesis, not the final conclusion |
| investment-thesis-tab | Separate investment-conclusion specialist after valuation, thesis validation and challenge; workbook-specific bands/layout remain optional |
| management-questions | Retained as a focused specialist, including material cash/accounting/governance questions |
| boss-update-note | Generalised to research-brief; user-selected language/audience, traceable sources and a concrete next task |

New specialists address evidence intake, cross-asset strategy/testing, research challenge, portfolio decision and monitoring/review. These are research roles and methods, not newly implemented service adapters.

## Material corrections

| Source issue | Why it matters | Replacement |
| --- | --- | --- |
| Automatic approval after every model-update step | Conflicts with the founder's proactive research direction; duplicates existing task authorisation | Continue authorised local analysis; preserve explicit stepwise preferences and actual action approvals |
| Links to absent fill-3s-model, forecast-revenue-cogs and conclude-valuation-action skills | The stated six-step pipeline cannot be followed from this collection alone | All coordinator routes point to included specialists; gaps are explicitly represented |
| Mandatory financial/narrative report before action | Forces a single-company framework onto other markets and bloats narrow requests | Conditional company branch; separate index, commodity, FX/rates, crypto and pair/carry analysis |
| Complete source removal from final reports | Prevents a reader from checking material claims and conflicts with Pip's traceability objective | Readable links/footnotes plus a retained evidence register; opaque internal IDs stay internal |
| Twenty-page reports, fixed table/word/chart counts | Tests document length rather than whether the research answers a decision | Proportionate briefs; requested long reports receive their own rendering/layout checks |
| Narrative changes as the only source of excess return | Overstates a theory as a universal fact and encourages confirmation bias | Multiple explicit return hypotheses and a separate counter-case |
| Model integrity and post-valuation thesis validation conflated | A valuation needs reliable model outputs, while the priced thesis needs a later targeted evidence test | Historical checks during model building, completed-model audit before valuation, then targeted thesis validation and challenge |
| Correcting third-party figures until identities sum | Arithmetic alone does not identify the wrong observation | Preserve raw figures; normalise separately; explain definition/timing/scope/rounding residuals |
| Generic cumulative subtraction and hard ACT labels | EPS/ratios/stocks are not additive quarterly flows; provenance can disappear | Derive compatible flow amounts, preserve calculation/source status and compute weighted per-share measures separately |
| Missing vendor access treated as mandatory or silently satisfied | Creates brittle stopping points or fictitious verification | Capability inventory, permitted alternatives, partial handoffs and explicit critical gaps |
| Older guide overridden by a fixed run-rate, or guide hit exactly | Neither extrapolation nor management targets are facts about future outcomes | Check vintage/metric and compare supported scenarios, including implied remaining periods |
| Q4 costs capped to achieve vesting KPIs | Manufactures earnings rather than analysing award terms/accounting | Separate incentive conditions, supported expense estimates and forecast outcomes; no KPI floor under earnings |
| Net income approximately equals equity cash flow | Can ignore capex, working capital, financing and dilution | An explicit NI-to-FCFE/FCFF bridge and consistent valuation basis/rate |
| Weak conversion addressed by lowering implied terminal profit | Confuses achievable value with earnings required to justify a fixed price | Model the cash-conversion effect numerically; distinguish required earnings from achievable earnings |
| Fixed 2035 endpoint, universal rate grid and date-inferred fiscal anchor | Makes results change with the calendar and imposes unjustified assumptions | Explicit fiscal/source anchor, transition horizon and rate/growth scenarios |
| Range membership presented as proof of exact scenario matching | A value between min/max need not equal the scenario used in the report | Match each output to its actual input scenario/version and reproduce the calculation |
| Fixed cells such as H44/I44/J44 | Breaks on user edits, different templates or period rolls | Semantic metric/period maps and explicit ambiguity checks |
| Period-end FX for all Hong Kong reporting data | Stock, flow, transaction and presentation bases differ | Preserve native currency and choose the appropriate conversion purpose/rates |
| Skip accounting/balance-sheet management questions | May miss the issue that dominates liquidity or downside risk | Rank questions by decision impact across valuation, cash, risk and implementation |
| Broad claims about openpyxl destroying all charts/images | Overstates a real but feature-dependent preservation issue | Inspect actual workbook features and use a supported, tested writer; recalc/preservation remain separate checks |
| Printed checks/format compliance presented as substantive validation | A report can satisfy page/font rules while containing unsupported claims | Source/claim/dependency/readiness checks and independently known numerical invariants |

These are analytical method corrections, not a restatement of any issuer's actual financials. Apply the reporting framework relevant to the issuer, including PRC GAAP, IFRS or US GAAP as appropriate; the IFRS references below are checks on specific concepts, not a universal accounting mandate.

## New cycle and feedback

Primary company research: evidence -> historical 3S -> operating data -> management guidance -> forward model -> model/consensus audit -> valuation and implied expectations -> targeted thesis validation and counter-case -> investment conclusion -> brief and follow-up.

The [detailed company sequence](../skills/pip-research-cycle/references/company-sequence.md) maps the original skills to these stages and defines model-ready, valuation-ready and conclusion-ready gates. Questions are a side branch whenever information could change the model or view. Model audit and thesis validation reuse one financial-quality specialist but have distinct purposes and artifact IDs.

When implementation is requested, extend the researched conclusion through exact instrument/strategy design, net-cost testing, implementation challenge, portfolio fit/sizing and monitoring/attribution. Non-company markets use an asset-appropriate route. These downstream tasks do not replace the primary analyst sequence. Recurring reviews reuse current work and invalidate affected dependencies.

No-action outputs must retain a reason, the uncertainty that would change the decision, a next investigation or observable trigger and a review time. Monitor specifications remain planned until an actual service acknowledges activation. A daily schedule is distinct from market observation and notification delivery.

## Imported resources and preservation

Read all ten entry points, the raw collection README, the workbook house profile and selected implementations relevant to the detected issues: quarterly filling, the reverse-DCF solver, calculation checker, report checker and preflight. Company-specific worked examples and binary templates are preserved as references; they were not executed, fully audited or certified clean/recalculating.

In particular, the imported calculation checker can install a dependency on import, report checks prohibit source markers, and the preflight assumes unrelated local authentication/configuration paths. The curated validators do not import or run these files. No keys were requested, copied or tested, and no workbook was overwritten.

## Checks and limits

- Authoring checks: skill frontmatter/names, included routes, dependency order, relative links, schema consistency and original-file hashes.
- Numerical checks: an independently known constant/growing perpetuity, units/rates, terminal timing, infeasible roots, negative-flow boundaries and cash-conversion direction.
- Handoff checks: source references and availability/cutoff, derivation records, material gaps, version invalidation, mandate/freshness, synthetic separation and planned/active watch distinctions.
- Behavioural evaluation prompts: [realistic cases](../skills/evals/research-cases.md), including model-before-valuation sequencing, for a future configured-model pass. Automated shape/numeric checks do not prove a model follows the methods or that a strategy is profitable.

The initial numerical/handoff checks comprised eighty-nine passing automated tests (including twenty-five new cases), with project TypeScript checks passing. The revised model-first bundle additionally validates its twelve skill entry points, five ordered catalog routes and original-file hashes. No independent live-model behavioural evaluation was run.

The schema and catalog do not enforce the entire research protocol in the live harness. [Runtime integration](../skills/pip-research-cycle/references/runtime-integration.md) still needs stage selection, selective context loading, artifact persistence/invalidation, additional reviewed retrieval/calculation/backtesting adapters, independent proposal checks and actual watch-service integration. Existing tool/authority/budget boundaries remain authoritative.

## Primary method checks

- Interim reporting and comparable period information: [IFRS IAS 34](https://www.ifrs.org/issued-standards/list-of-standards/ias-34-interim-financial-reporting/).
- EPS numerator and weighted-share denominator: [IFRS IAS 33](https://www.ifrs.org/issued-standards/list-of-standards/ias-33-earnings-per-share/).
- Currency translation bases: [IFRS IAS 21](https://www.ifrs.org/issued-standards/list-of-standards/ias-21-the-effects-of-changes-in-foreign-exchange-rates/); presentation-currency treatment and practical average-rate limits appear in paragraphs 39–40 of the [published standard](https://www.ifrs.org/content/dam/ifrs/publications/pdf-standards/english/2022/issued/part-a/ias-21-the-effects-of-changes-in-foreign-exchange-rates.pdf).
- Recognition of share-based payment effects and condition-specific treatment: [IFRS 2](https://www.ifrs.org/issued-standards/list-of-standards/ifrs-2-share-based-payment/) and the [IASB research paper on condition classification](https://www.ifrs.org/content/dam/ifrs/resources-for/investors/investor-summaries/ap16-ifrs-2-share-based-payment.pdf). The research paper is explanatory context, not a substitute for the applicable current standard.
- Consistent cash flows/discount rates and the equity cash-flow bridge: [Damodaran's valuation inputs lecture](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/lectures/dcfinput.html).
- Actual deployer-defined contracts, oracles, fees and margin pools: [Hyperliquid HIP-3 documentation](https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/hip-3-builder-deployed-perpetuals).
