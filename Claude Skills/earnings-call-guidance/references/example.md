# Worked example: 宇通客车 (600066) 3Q26 call, 2026-10-15

Inputs: `3Q26 Transcript.txt` (AI transcript, traditional Chinese, with 会议要点 and Q&A recap at the end) and `宇通客车 1015.xlsx` (tabs: 3S, Revenue Projection, Monthly, Quarterly, 问题, Guidance).

## Step 2: fact-check table (chat)

| Transcript says | Corrected to | Evidence | Confidence |
|---|---|---|---|
| 中美…IRA法案 (answer to a question on 中欧 trade talks) | 中欧…IAA (EU Industrial Accelerator Act, "Made in Europe" rules for public procurement) | Question was about EU; user's 问题 tab: "IAA欧盟法案"; old Guidance note: "IAA没有进展" | High |
| I基金 / RM基金 / L基金 (Europe fund expiring Q2) | EU RRF (Recovery and Resilience Facility; milestones due 31 Aug 2026) | Same answer uses three spellings; RRF funds e-bus purchases in several member states; timing matches | High |
| 中國網數據 | 中客网 (chinabuses) | Model's industry tab header: 行业数据（中客网） | High |
| 唐總 | 汤玉祥 (chairman, actual controller) | Annual report 2023 / web search | High |
| 新能源出口退税…FOB×4% | Export VAT rebate on NEVs cut 13% → 9% from 1 Apr 2027 | Web search (MOF/STA announcement, Oct 2026) | High |
| 奇瑞、萬達 (named as NEV-export competitors) | Unclear | Not resolved | Low (left out) |

## Step 3: guidance and anchors (chat, English), abbreviated

**FY26 volume guidance (unchanged):** total ~50,000 (~flat); domestic ~30,000 (down); exports 19,000 (+11%); export NEV 5,000 (+25%).

**9M26 actuals (大中型 only, from 中客网):** 24k (−10.8%); domestic 14k (−18.9%); exports 10k (flat); export NEV 2,600 (+12%).

Derived: implied Q4 export NEV = 5,000 − 2,600 = ~2,400, close to the whole 9M figure. Deliveries concentrated in December.

**Industry (CAAM, 9M26, 大中型):** 83k (+1.8%); domestic 39k (−4.6%); exports 44k (+8.2%); NEV exports 13.5k (+20.8%). Derived Yutong share ~29% total, ~23% exports.

**P&L:** 9M revenue 258.2亿, net profit 31.8亿, GM 25.3% (+2.9pp), OCF 80亿. Q3 margin called a one-off order-quality fluctuation; Q4 margin "relatively high"; long term stable with gradual uplift. Full-year tax rate similar to last year.

**ASP anchor:** export NEV 260–270万/unit in Q3 26 vs 180–190万 in Q3 25 (300 low-priced Pakistan units). Order mix, not a trend.

**Cash:** cash + trading assets ~128亿, plus wealth products ~140亿. (Body said "180 28個億"; AI summary said 128亿, which was used.)

## Step 4: Guidance tab content

宇通客车 3Q26 业绩会核心指引（2026-10-15）

**销量（全年目标不变）**
1. 总销量约5万辆，同比基本持平。
2. 国内销量约3万辆，同比下降。
3. 出口1.9万辆，同比增长11%。
4. 出口新能源5000辆，同比增长25%，公司对完成新能源目标信心更足。
5. 四季度出口和出口新能源同比、环比都会大幅增长，交付集中在12月。

**毛利率**
6. 三季度毛利率高，主要因为订单质量好、海外占比高，属于阶段性波动，不能当作趋势。
7. 四季度毛利率预计仍在相对较高的水平。
8. 长期毛利率求稳，高端化推进会带来缓慢提升。

**税率**
9. 三季度税率下降是结构性原因，全年所得税率和去年差不多。

**现金与分红**
10. 前三季度经营现金流80亿，类现金资产约140亿。
11. 近两年没有大额资本开支，会继续保持较好的分红水平。

**明年展望**
12. 2027年出口大概率继续增长，具体目标要到2027年3月左右公布。
13. 欧洲纯电城间车是新机会：去年约100台，今年200台以上，价格和盈利与公交接近。

Dropped as minor (listed in one chat line): export VAT rebate cut (management: <2% of export NEV revenue, 影响不大); battery cost (年度定价, 波动不大); EU IAA (no progress, no action until it lands); RRF expiry (各国已接续, 影响不大); shipping capacity; overseas competition; Africa strategy; other regions' NEV demand.
