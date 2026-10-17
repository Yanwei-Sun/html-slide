# Talk script

Edit the text between each pair of `slide-note` markers, then run `npm run script:apply`.
Click 0 means the note on entry. Keep the headings and markers. `<b>...</b>` adds a bold cue.
Use `npm run script:watch` to apply saved changes while you edit. Reload the deck to see them.

<!-- Base hashes prevent an old script from overwriting newer slide notes. -->

## 1 · M01 (M01)

### M01.0 · on entry
<!-- slide-note {"sid":"M01","k":0,"base":"5a6d4ce538a000c8170c3b80d6b8bfa5f40bff08f8ffe1c4b7ff9b52b5d94209"} -->
Thank you all <b>for coming</b>. Today I'm going to talk about how AI services <b>should</b> be priced. This is <b>joint work</b> with Professor Ilan Lobel and Professor Jiahua Wu.
<!-- /slide-note -->

## 2 · OpenAI on token pricing (M03Q)

### M03Q.0 · on entry
<!-- slide-note {"sid":"M03Q","k":0,"base":"9eedd1458b5acfbc9f3a07953c92f8aaf0a2b851b3b09fa4d832cf3056e1e423"} -->
Today, most commercial AI is priced by tokens: you pay for every token the AI <b>reads</b> and <b>writes</b>. But tokens measure <b>attempts</b>, <b>not results</b>. This is Greg Brockman, the president of OpenAI. At the launch of its Astra model in September 2026, he said: “Pricing in tokens doesn't make any sense. Price per task is what matters.”
<!-- /slide-note -->

### M03Q.1 · click 1
<!-- slide-note {"sid":"M03Q","k":1,"base":"5585ca320c419e0b743876bb21f1c0b4e6ea1f8357e7a3184c3f50560d72e62e"} -->
But what exactly does “price per task” mean? Every task the AI handles, <b>whatever</b> the <b>outcome</b>? That's usage-based pricing. Or <b>only</b> the tasks it completes? That's pay for success.
<!-- /slide-note -->

## 3 · Companies are moving to pay for success (M04)

### M04.0 · on entry
<!-- slide-note {"sid":"M04","k":0,"base":"78ff1ecf2d7dd4c446da59c7473b9ce4a0a5ea71fa7482bc506ffce59a30c423"} -->
And many AI companies are moving to the <b>second answer</b>. Zendesk, for example, sells AI agents for customer service, and <b>charges only</b> for the requests its agent resolves.
<!-- /slide-note -->

### M04.1 · click 1
<!-- slide-note {"sid":"M04","k":1,"base":"a845af497e355b36c3f8747a4677ba84925728557d1a8ef8399159e6b66a9c3d"} -->
<b>Even</b> OpenAI is reportedly testing pay on completion with some large customers. The idea is <b>simple</b>: payment is tied to business value.
<!-- /slide-note -->

## 4 · Why does this matter? (M09B)

### M09B.0 · on entry
<!-- slide-note {"sid":"M09B","k":0,"base":"15e2d80753d0a475ddeb04a773ab6ca4a6d3706f76d8ae9018017cb1a2d823a7"} -->
Why does this choice matter? Because we've <b>seen it before</b>. Let's travel back <b>about 25 years</b>, to the early days of search ads. At first, Google sold impressions: the advertiser paid each time the ad was shown, whether or not <b>anyone</b> clicked.
<!-- /slide-note -->

### M09B.1 · click 1
<!-- slide-note {"sid":"M09B","k":1,"base":"5ed625519abd52fbf714e0b95db6111ac303aebce77ba0705d4d377a86a60280"} -->
Then Google moved to pay per click: if your ad isn't clicked, you <b>don't</b> pay. With this <b>business model</b>, among other things, Google won the search ads market.
<!-- /slide-note -->

### M09B.2 · click 2
<!-- slide-note {"sid":"M09B","k":2,"base":"5092e6b70f15f476b648b0b183244b80fa241a4c29a764fda37af9752d38ac49"} -->
AI services face the <b>same choice</b> today: pay per use, or pay per success. Will pay per success also win here, and <b>under what conditions</b>?
<!-- /slide-note -->

### M09B.3 · click 3
<!-- slide-note {"sid":"M09B","k":3,"base":"46d5f33372ab16c6f6491c4f07e11523a1886713d5485b2abba4e480e2f3bf03"} -->
AI companies compete not only on models, but also on business models. Under pay per success, the seller still pays to run a failed attempt, but <b>earns nothing</b> for it. <b>Right now</b>, this choice is being made in customer service.
<!-- /slide-note -->

## 5 · Example: customer service (M08)

### M08.0 · on entry
<!-- slide-note {"sid":"M08","k":0,"base":"b8a33410ea49888dbb6c80fc3845fa1ed6522a44f41adbf7f5d5f89fe53854fd"} -->
Picture a firm that serves its own customers. That firm is our AI buyer. Without AI, every request goes to the firm's human staff. Their <b>capacity</b> is <b>limited</b>, so customers may <b>wait</b> in a queue.
<!-- /slide-note -->

### M08.1 · click 1
<!-- slide-note {"sid":"M08","k":1,"base":"5c36f3f8c794116ef9b477d1a8b704c62be72f7db3334e917f8fecad39deb4bd"} -->
Now the firm buys an AI agent from an AI company, our AI <b>seller</b>. The agent resolves some requests right away and escalates the rest, so <b>fewer</b> customers <b>wait</b> in <b>line</b>.
<!-- /slide-note -->

### M08.2 · click 2
<!-- slide-note {"sid":"M08","k":2,"base":"4a18baa5a765f291b6a7cad6f2caec90e85d43f64f9295815bbd9b9113325a7e"} -->
How should the AI company price this agent? <b>Sellers answer differently</b>: <b>some</b> use usage-based pricing, <b>others</b> pay for success.
<!-- /slide-note -->

## 6 · Who decides what counts as a success? (M09)

### M09.0 · on entry
<!-- slide-note {"sid":"M09","k":0,"base":"2207ff0e7b35eb1d94299184745e46ac9dfd1e77adc85bce0183878a27396f9c"} -->
But who decides what counts as a success? Here's a <b>decision tree</b> Zendesk <b>published</b> for deciding which requests qualify. If the customer asks for a human, it's unresolved.
<!-- /slide-note -->

### M09.1 · click 1
<!-- slide-note {"sid":"M09","k":1,"base":"38ac07cac386b8fbdd5690bc42bb90854ecedb832d24aef1e18365a08a6bdf6d"} -->
Negative feedback goes <b>straight</b> to unresolved. With positive feedback, or <b>none at all</b>, the conversation ends after 72 hours. Then an AI evaluation marks the response as relevant or not, and <b>only</b> a relevant response counts as an automated resolution.
<!-- /slide-note -->

### M09.2 · click 2
<!-- slide-note {"sid":"M09","k":2,"base":"ec01d744771f9887889b99fc5dadd026caa86f5bad1dcdbc27cc6f32e8e0408e"} -->
And that's the <b>problem</b>: success is often a judgment call, and the seller's <b>own</b> AI makes it.
<!-- /slide-note -->

### M09.3 · click 3
<!-- slide-note {"sid":"M09","k":3,"base":"1c264e1c2ca5dd2ecae3f63ec5c1d982fb02fc89012ea34d69f6da6b0b6b1dca"} -->
The seller owns that AI, so it can <b>fine-tune</b> how the AI <b>judges</b>, and in ambiguous cases, decide in its own favor.
<!-- /slide-note -->

### M09.4 · click 4
<!-- slide-note {"sid":"M09","k":4,"base":"dedadd868bec174a31f75ce55211757c3610f15b3005bcda56915f4c0a655888"} -->
Can the buyer <b>push back</b>? Yes, but at a verification cost: someone has to go back and <b>review</b> the <b>conversation</b>.
<!-- /slide-note -->

## 7 · Research question (M10)

### M10.0 · on entry
<!-- slide-note {"sid":"M10","k":0,"base":"2cfe1d91320961e1ea3daf00e6a5ea2542b0fe19733481b2cd47c086fb21b4aa"} -->
Put these <b>pieces together</b>, and <b>you get</b> our research question: what are the revenue and incentive implications of pricing AI services based on outcomes?
<!-- /slide-note -->

### M10.1 · click 1
<!-- slide-note {"sid":"M10","k":1,"base":"be56d6469d9abc4b55cf9acf07f638801d4fc9ed2630efdf5cdc1c4b8f22e0c7"} -->
The key challenge is that seller-defined success may not match true success. That's what's new here. In a classic outcome-based contract, the worry is <b>moral hazard</b>, a supplier's hidden effort. Here, the seller runs its own AI, so <b>no effort is hidden</b>. What it controls is how its AI decides what counts as a success. And <b>only</b> the <b>buyer knows</b> what a success is worth to her, and how hard her task is for the AI.
<!-- /slide-note -->

### M10.2 · click 2
<!-- slide-note {"sid":"M10","k":2,"base":"3ed68e789fc40dfeef870d91c49845ffbf56f787b8e248ef0ac65e5702a1cf62"} -->
That gives us two questions. First, which <b>earns</b> the seller more: pay for success, or usage-based pricing? Second, what is the optimal mechanism, and how does it resolve the <b>gap</b> between reported and true success? To answer them, we <b>need a model</b>.
<!-- /slide-note -->

## 8 · Model (S1)

### S1.0 · on entry
<!-- slide-note {"sid":"S1","k":0,"base":"129991110cb163f29e2a1b46bc3f84d1a8f87165d1544a1f887a47b55694ae9c"} -->
One AI seller sells to <b>one business buyer</b>. Her task <b>succeeds or fails</b>.
<!-- /slide-note -->

## 9 · The model (D01)

### D01.0 · on entry
<!-- slide-note {"sid":"D01","k":0,"base":"f333c993e409c09573559f598568c1fcff9b8450f3153ca4f2e0429399cb7d53"} -->
Start with the seller: one AI company with a range of AI capabilities, like <b>different</b> models, or one model with more or less <b>reasoning effort</b>.
<!-- /slide-note -->

### D01.1 · click 1
<!-- slide-note {"sid":"D01","k":1,"base":"58aecefe30ceaf0fc959ac8d3873630d8a456048966147958915041cff8f1666"} -->
Running the AI costs the seller money on <b>every attempt</b>, success or failure. On the other side is the AI buyer, who pays for the <b>agent's work</b> on her tasks.
<!-- /slide-note -->

### D01.2 · click 2
<!-- slide-note {"sid":"D01","k":2,"base":"2be4b142f629fe6370d787f5aceeec69a4433ab13a97fc928f5ee94652145502"} -->
She knows <b>two things</b> the seller doesn't, and together we call them her type. One is what each outcome is worth to her: one value if the task succeeds, another if it fails. The other is <b>how hard</b> her task is for the AI, which sets her success probability.
<!-- /slide-note -->

### D01.3 · click 3
<!-- slide-note {"sid":"D01","k":3,"base":"a3bec01f8c46859151adc1a1e812008e53bc3f1b8e4a41b5dd5be3df124aef03"} -->
So what matters to her is her <b>expected</b> value: the two outcome values, <b>weighted</b> by how often each happens.
<!-- /slide-note -->

## 10 · Buyers have two-dimensional private information (D02)

### D02.0 · on entry
<!-- slide-note {"sid":"D02","k":0,"base":"02f7650a285d5b05801bdc7537c3d2f3a6172ec2392b71881a7f29856563fd54"} -->
<b>Let me plot</b> each buyer type as <b>one dot</b>, by her success probability and her expected value.
<!-- /slide-note -->

### D02.1 · click 1
<!-- slide-note {"sid":"D02","k":1,"base":"a689075ecc6755b8d89bd4551bc1aac12840038c48611596027e472c6594ce4a"} -->
Deploy <b>another</b> capability, and each dot moves in <b>its own way</b>.
<!-- /slide-note -->

### D02.2 · click 2
<!-- slide-note {"sid":"D02","k":2,"base":"4fd59c726e42554304d8ec8c2d090549a63161d5902de7bc9a157167283fe1f3"} -->
Take these two buyers: one has high value but hard tasks, the other low value but easy tasks. Each is ahead on one dimension and behind on the other, so there's no natural high type. And there's <b>another complication</b>: the AI itself <b>reports the outcome</b>.
<!-- /slide-note -->

## 11 · Buyer success ≠ AI success (D03)

### D03.0 · on entry
<!-- slide-note {"sid":"D03","k":0,"base":"19253a3b0f7020297d3da0324b5a64b6e1c53fcbca11ee0c55d703b4b4f47649"} -->
Each task now has a true outcome, by <b>her own standard</b>, and an AI-reported outcome, which is <b>what she pays on</b>. The two may differ.
<!-- /slide-note -->

### D03.1 · click 1
<!-- slide-note {"sid":"D03","k":1,"base":"63dffe955d81c737f171f71bb682f52098d08ad689a534c8c3ffba18abedaa4b"} -->
The seller designs the outcome-alignment rule: how often a true success is reported as a success, and how often a true failure is. When the report always matches the truth, we call it full outcome alignment. The seller may choose <b>any</b> rule, even one that calls failures successes. We give it <b>a lot of power</b>, and later we'll show it <b>never needs it</b>. It <b>commits</b> to the rule up front, so the buyer knows it.
<!-- /slide-note -->

## 12 · Timeline (D04)

### D04.0 · on entry
<!-- slide-note {"sid":"D04","k":0,"base":"dcd04d6e4e1aa8410b96aa7093a44af8d27400b16c69516433df960f1f045d39"} -->
What can the seller offer? By the revelation principle, it <b>loses nothing</b> with a <b>direct mechanism</b>. That's a menu with one item per buyer type, designed so that each buyer picks the item <b>meant for her</b>. Each item has an AI capability, a success price, a failure price, and an outcome-alignment rule.
<!-- /slide-note -->

### D04.1 · click 1
<!-- slide-note {"sid":"D04","k":1,"base":"07054f8326014d9fb979f38d416e96ecba255127564cf9e9917654739baca4b9"} -->
The seller offers the menu. The buyer, who <b>knows</b> her type, picks an item, and its AI capability is deployed <b>on her task</b>.
<!-- /slide-note -->

### D04.2 · click 2
<!-- slide-note {"sid":"D04","k":2,"base":"42bfbca2d3fd248b617c286ae427afeb0c1d1ffd4c82709df31ddc141f1e58bf"} -->
At payment time, <b>neither side</b> observes the true outcome. <b>What they see</b> is the AI's report, made under the rule in her item.
<!-- /slide-note -->

### D04.3 · click 3
<!-- slide-note {"sid":"D04","k":3,"base":"60957092f95be62e04a70b9a8e412f1799dbae198364fea35d2ad122d41842da"} -->
She knows the rule, so she updates her belief about <b>what really happened</b>. Then she pays based on the report, or disputes it. A dispute checks the true outcome, at a verification cost to <b>both sides</b>.
<!-- /slide-note -->

## 13 · The seller's problem (D05)

### D05.0 · on entry
<!-- slide-note {"sid":"D05","k":0,"base":"3f6a547cc20b8a5bb36a856a7612804a906d2a4ce4ae42866585d042eaa0c0ff"} -->
The seller maximizes <b>expected profit</b>: the payments it collects, minus its verification costs and the cost of <b>running</b> the <b>AI</b>.
<!-- /slide-note -->

### D05.1 · click 1
<!-- slide-note {"sid":"D05","k":1,"base":"07b8e72ea23c1369b1fb7d5af3cb2bb61b6f93ae6fed130f906705b94629021b"} -->
There are <b>three constraints</b>. Sequential rationality: after each report, the buyer pays or disputes, <b>whichever is better</b> for her.
<!-- /slide-note -->

### D05.2 · click 2
<!-- slide-note {"sid":"D05","k":2,"base":"c1dd758fd3f6eb179d38dcf6451b57be4522a248a7bfe6cc1f50937c033e9aa3"} -->
Incentive compatibility: each buyer prefers the item <b>meant for her</b>. And individual rationality: she's at least as well off buying as <b>walking away</b>. Now, to the results.
<!-- /slide-note -->

## 14 · Usage-based vs. pay only for success (S2)

### S2.0 · on entry
<!-- slide-note {"sid":"S2","k":0,"base":"5b785e4016a92d38496828a9978f291845cf845835ce5f25ab4a2b84f98e62f3"} -->
Our <b>first question</b>: how does pay for success compare with usage-based pricing? We take its <b>pure form</b>: pay only for success.
<!-- /slide-note -->

## 15 · Two pricing formats (U01)

### U01.0 · on entry
<!-- slide-note {"sid":"U01","k":0,"base":"41afb240f1246b4e50b0af82e6f4688e2f003e04671a058573500810543b2894"} -->
Usage-based pricing charges the <b>same</b> price per task, <b>whatever the outcome</b>. Pay only for success sets the failure price to zero.
<!-- /slide-note -->

### U01.1 · click 1
<!-- slide-note {"sid":"U01","k":1,"base":"2d2512ab4b8d28098d5b68a3575b032d24b829358f7736b946000f9b64d25f13"} -->
Under pay only for success, the <b>report</b> <b>decides whether</b> she pays.
<!-- /slide-note -->

## 16 · Comparison of UBP and PFS (U05)

### U05.0 · on entry
<!-- slide-note {"sid":"U05","k":0,"base":"43accd3e83f02e406c9bd773826a70ff8bb21eeeaf726c2d75bc60c06abeebe8"} -->
We split the profit difference into <b>two parts</b>. The payment-base gap compares the formats with <b>accurate reports</b>. The outcome-misalignment gain is what a tuned metric adds.
<!-- /slide-note -->

### U05.1 · click 1
<!-- slide-note {"sid":"U05","k":1,"base":"a58fb89255b88ffd4caf9fe65e9ceba3d934ae587f96757f38653874cb0c1b33"} -->
<b>First</b>, the payment-base gap. With <b>accurate reports</b>, <b>who buys</b> under each format?
<!-- /slide-note -->

## 17 · Who buys (U02)

### U02.0 · on entry
<!-- slide-note {"sid":"U02","k":0,"base":"589465d7ca043be1f66e19ade8f27f487f5e8c50b19508018ea8c008b93362f7"} -->
Fix <b>one AI capability</b>. <b>Each dot</b> is a buyer type.
<!-- /slide-note -->

### U02.1 · click 1
<!-- slide-note {"sid":"U02","k":1,"base":"1fdebb6a08aafdcf50cb14bccc1bf1d86e3ac87927044ce144bdd3ef89d863c6"} -->
Under usage-based pricing, she buys if her expected value is <b>at least</b> the price: everyone above this <b>flat line</b>.
<!-- /slide-note -->

### U02.2 · click 2
<!-- slide-note {"sid":"U02","k":2,"base":"3289266faecda17bba1a3b84bf0cfed279af3bdf390469705e0163e24688997e"} -->
Under pay only for success, she pays the success price <b>only when</b> her task succeeds. With zero failure value, the slope of <b>her dashed line</b> is her success value.
<!-- /slide-note -->

### U02.3 · click 3
<!-- slide-note {"sid":"U02","k":3,"base":"7ae418561394262d368b4e83a1186beef4f7334d5941ef0fff86c87a50b7675e"} -->
In the first <b>extreme</b>, all buyers have the same expected value. One usage price takes <b>all the surplus</b>: that's the first best, what the seller could earn if it <b>knew each type</b>.
<!-- /slide-note -->

### U02.4 · click 4
<!-- slide-note {"sid":"U02","k":4,"base":"e52812f35ac69d00f2d7d6cbe935ee625dfac3bdbdacab32f40e0b7c92582b24"} -->
Pay only for success <b>can't do that</b>. Success value <b>falls</b> as success probability rises, so the buyers who value a success most <b>rarely pay</b>.
<!-- /slide-note -->

### U02.5 · click 5
<!-- slide-note {"sid":"U02","k":5,"base":"7a379d6b79fa50fc45715a7a7df0a94094f361ae348c87aa036151d53e03093f"} -->
In the <b>other extreme</b>, all buyers have the same success value, and pay only for success <b>reaches</b> the first best.
<!-- /slide-note -->

## 18 · Which format wins? (U02T)

### U02T.0 · on entry
<!-- slide-note {"sid":"U02T","k":0,"base":"2a6946ed559f052eb19dec1cb19da1c27f0ebb91b075e0f293baa7cd7f469eaf"} -->
Both extremes generalize, under a separability condition. If success value falls with success probability, <b>fast enough</b> that expected value falls too, usage-based pricing does at least as well. If it rises, pay only for success does. <b>I'd argue</b> the first is more natural: a task that's hard for AI is usually hard <b>for humans too</b>, and more valuable to solve.
<!-- /slide-note -->

## 19 · Application: customer service (U06)

### U06.0 · on entry
<!-- slide-note {"sid":"U06","k":0,"base":"4e311800b87318f6409fd8264106b5419350229eebbb2a605786ef718d191c73"} -->
Back to customer service. Each request goes <b>first</b> to the AI agent, and the ones it can't resolve <b>join</b> the <b>queue</b> for the firm's human staff.
<!-- /slide-note -->

### U06.1 · click 1
<!-- slide-note {"sid":"U06","k":1,"base":"3e3f13c43beabf7884d4498b508ee6625777f55ed0441b99e929139cc1bce060"} -->
The firm's type is its arrival rate, its staff and their service rate, and the AI's success probability. The <b>first three</b> set <b>how busy</b> the staff are.
<!-- /slide-note -->

### U06.2 · click 2
<!-- slide-note {"sid":"U06","k":2,"base":"7d1dde2e74ed9bedafdc92afbd97bbe71fabe0cf5b994fdf373b483413b3fa57"} -->
The AI's value to the firm is the congestion cost <b>it saves</b>: fewer requests reach the staff, so customers <b>wait less</b>.
<!-- /slide-note -->

### U06.3 · click 3
<!-- slide-note {"sid":"U06","k":3,"base":"9cb05ac7fd174cbe8cfce566e8c24cec86185e581d836efb4f3a9a37fe4beee7"} -->
We assume congestion cost rises, and <b>rises faster</b>, as the staff get <b>busier</b>, like the waiting cost of an M/M/N queue.
<!-- /slide-note -->

## 20 · Complements or substitutes: which format wins? (U07)

### U07.0 · on entry
<!-- slide-note {"sid":"U07","k":0,"base":"18943d84f3182892a70f2ead1387b875981ef12f007613d4690aafae4b8649a6"} -->
Take two types of <b>firm</b>, <b>and say</b> the AI is better at type 2's tasks.
<!-- /slide-note -->

### U07.1 · click 1
<!-- slide-note {"sid":"U07","k":1,"base":"501c41e388389d5b1c9c0b61bd75fbf0b58c629b1db6904a6d5c363570bf667b"} -->
AI and human staff are complements when the AI is strong where type 2's staff are slow: <b>below</b> the <b>dashed line</b>. <b>Above it</b>, type 2's staff are fast too, and they're substitutes.
<!-- /slide-note -->

### U07.2 · click 2
<!-- slide-note {"sid":"U07","k":2,"base":"6573015d12ffe7df312f8a32986d1c7815221e5ca95039c681f13fd34f4289ad"} -->
Complements favor pay only for success: the AI <b>succeeds most</b> where each success <b>saves</b> the <b>most waiting</b>. Substitutes favor usage-based pricing.
<!-- /slide-note -->

## 21 · The outcome-misalignment gain (U05C)

### U05C.0 · on entry
<!-- slide-note {"sid":"U05C","k":0,"base":"5350df7cd696b45b6045f1d13c49fade3430cdf20238a1839f00c3361cbabec9"} -->
<b>Now</b> the <b>second part</b>: the outcome-misalignment gain.
<!-- /slide-note -->

### U05C.1 · click 1
<!-- slide-note {"sid":"U05C","k":1,"base":"569b45314adab75065c9b63ad7405cdbc0cfb0f861445a43131199a976435cc3"} -->
This is the seller's best profit under pay only for success, against the verification cost. If checking is free, <b>bending</b> the <b>metric</b> <b>adds nothing</b>.
<!-- /slide-note -->

### U05C.2 · click 2
<!-- slide-note {"sid":"U05C","k":2,"base":"5163395d7bf68756ad2d05642c5e8199f4773eb168a54ed86ea36f776bd1227c"} -->
If checking is so costly that she never checks, pay only for success, with the right rule, <b>earns as much</b> as the best two-price contract. Flexibility in information is <b>as good as</b> flexibility in pricing.
<!-- /slide-note -->

### U05C.3 · click 3
<!-- slide-note {"sid":"U05C","k":3,"base":"aa44ad7bd7abd0b85e105e500f7b071c9617f6cbb8212ab536b56c63e60fddbf"} -->
<b>Take</b> one item <b>with</b> two prices: $10 after a success, $4 after a failure.
<!-- /slide-note -->

### U05C.4 · click 4
<!-- slide-note {"sid":"U05C","k":4,"base":"f1d2efd52fc82856ca46a0450be6597a80e8d4c2dd080760ee7f5b190367e38b"} -->
Under pay only for success, <b>charge</b> $10, and <b>report</b> a failure as a success with probability 0.4.
<!-- /slide-note -->

### U05C.5 · click 5
<!-- slide-note {"sid":"U05C","k":5,"base":"7963557e579cf7eae289d63b9f7e226a5b030c01cdd2e03b49ba5f03e10af225"} -->
After a true failure, she <b>still</b> pays $4 <b>on average</b>, because she never checks.
<!-- /slide-note -->

### U05C.6 · click 6
<!-- slide-note {"sid":"U05C","k":6,"base":"94eaf539cb94c8ce4ec728beb1bef6a62fc3ec712d49d2a77e054314795dfad9"} -->
<b>In general</b>, as checking gets costlier, the seller's best profit under pay only for success never <b>falls</b>.
<!-- /slide-note -->

### U05C.7 · click 7
<!-- slide-note {"sid":"U05C","k":7,"base":"a336dd07d31dd3c88b37f72c92081da297ac3699f0245c42ad971ce399f4f994"} -->
So when checking is costly enough, pay only for success earns at least as much as usage-based pricing, by <b>counting some failures</b> as successes. Why not charge for failures <b>openly</b>?
<!-- /slide-note -->

## 22 · Optimal mechanism (S3)

### S3.0 · on entry
<!-- slide-note {"sid":"S3","k":0,"base":"4c7a0fda6afee9b9628525e1af6f785f9cf64a8983d51fc5470fda0326331f13"} -->
Our <b>second question</b>: once the seller can charge for failures <b>openly</b>, what is the optimal mechanism?
<!-- /slide-note -->

## 23 · What is the optimal mechanism? (O01)

### O01.0 · on entry
<!-- slide-note {"sid":"O01","k":0,"base":"ed3dc17ec4f9fe14378c68a7f2fac7033fbcb04de4de491fe7bb8a8f8cca7f7a"} -->
Each item now has a capability, two prices chosen freely, and any outcome-alignment rule, even one that <b>calls</b> a <b>true</b> failure a success.
<!-- /slide-note -->

## 24 · No need to distort the success metric! (O02)

### O02.0 · on entry
<!-- slide-note {"sid":"O02","k":0,"base":"277a0c43ef138f5a9b0997929241df7b3d066786bd8c7f9ce8e9a65e8e0c7c85"} -->
The answer: with no restriction on the contract, full outcome alignment is optimal. The seller never needs the <b>power we gave it</b>, and the buyer can take the AI's report at <b>face value</b>.
<!-- /slide-note -->

### O02.1 · click 1
<!-- slide-note {"sid":"O02","k":1,"base":"cde35e0abff6d556f7a9d9a2ccee2f94168c1efdba842612d1f708e01d9bb5ed"} -->
Think of the two prices as a fee per use plus a success bonus. The fee per use lets the seller charge for <b>every attempt</b>, so it never needs to <b>call</b> a failure a success to get paid. And the success bonus ties payment to performance.
<!-- /slide-note -->

## 25 · The optimal contract (O07)

### O07.0 · on entry
<!-- slide-note {"sid":"O07","k":0,"base":"58ba236c2dd00c1e68c0f8bb599e01eb2f4293948e1279bc7c1a7f3f0ffd2f4d"} -->
What does the optimal contract look like? Suppose success probability is task ease times AI quality, with positive quality at every capability. When <b>both ends</b> can be <b>served profitably</b>, the buyers with the hardest and the easiest tasks get first-best capability. That's what the seller would choose if it <b>knew their</b> type.
<!-- /slide-note -->

### O07.1 · click 1
<!-- slide-note {"sid":"O07","k":1,"base":"8c70a04e1792d3649f9850e7bf8817dc53e2639f89feb02ae8e3c3d6127fa33c"} -->
Everyone <b>in between</b> can <b>end up</b> above first best or below it.
<!-- /slide-note -->

### O07.2 · click 2
<!-- slide-note {"sid":"O07","k":2,"base":"11229996717b6065e0931bb7ce05f91f6a690e07c8d4b0f97049dd22acb1a5a1"} -->
That's a <b>sharp contrast</b> with standard price discrimination, where only the highest-value buyer <b>is sure</b> to get first best.
<!-- /slide-note -->

## 26 · Conclusion (S4)

### S4.0 · on entry
<!-- slide-note {"sid":"S4","k":0,"base":"b4f737edac41e9860d23243e6e5174658904a477ef0e8d3928deee816933203c"} -->
<b>Let</b> me <b>wrap up</b>.
<!-- /slide-note -->

## 27 · When does pay-only-for-success work? (C00A)

### C00A.0 · on entry
<!-- slide-note {"sid":"C00A","k":0,"base":"8f485bf2d1b05567b3eec002ff845da17f114ff60ad8552616db50633d667fcd"} -->
When does pay only for success work? With accurate reports, when the high-value tasks are the ones easy for AI. In customer service, that's when AI and human staff are complements. But <b>I'd argue</b> that's not the natural case, so pay only for success is <b>risky</b> for the seller.
<!-- /slide-note -->

## 28 · Will pay per success win? (C00)

### C00.0 · on entry
<!-- slide-note {"sid":"C00","k":0,"base":"167177a23dbc6f0906002d9392ebc7b1831b3920685d4b4727c58e8005ff2e76"} -->
So will pay per success win, <b>the way</b> pay per click did? In <b>the usual telling</b>, that's how Google won search ads.
<!-- /slide-note -->

### C00.1 · click 1
<!-- slide-note {"sid":"C00","k":1,"base":"9123fc03a69d12567c77866fdab6b2e3434fe577e6a3d62884375bb802c56654"} -->
But Google <b>billed</b> per click and adjusted for quality. It <b>ranked</b> ads by the bid times the click-through rate: what an ad offers to pay per <b>showing</b>. A hybrid won.
<!-- /slide-note -->

### C00.2 · click 2
<!-- slide-note {"sid":"C00","k":2,"base":"08da9930cb70df36bd7708ca1f7441191fa44a015fa25b0827c121a365070639"} -->
Our answer is similar. The best contract sits <b>in between</b>: a fee per use plus a success bonus, and with it, full outcome alignment is <b>optimal</b>. So, <b>just like</b> Google, the winner is <b>likely</b> a hybrid.
<!-- /slide-note -->

## 29 · Thank you (C02)

### C02.0 · on entry
<!-- slide-note {"sid":"C02","k":0,"base":"7518b3bea274a1ca8fa94dc4aebd0191aa0b816bc8a5745f4c76a38dafa14b2b"} -->
Thank you. I'm <b>happy</b> to take <b>your questions</b>.
<!-- /slide-note -->
