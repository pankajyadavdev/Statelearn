# Recommendation engine

`recommendationList()` ranks active courses linked to the learner's open role competency gaps. Each course can cover more than one competency; scores accumulate across gaps. The score is a transparent heuristic:

| Signal | Maximum weight |
| --- | ---: |
| Gap size | 30% |
| Role-required level | 25% |
| Career-goal/topic text match | 20% |
| Learning history | 10% |
| Difficulty fit | 5% |
| Prerequisite state | 5% |
| Role priority | 5% |

Completed courses are omitted. In-progress work is downweighted. If a candidate has an unmet prerequisite, the prerequisite is inserted earlier in the displayed sequence, even when it was not itself a direct top-ranked gap match. Explanation text lists the relevant competency gaps and prerequisite reason. The calculation is deterministic for the same profile and catalogue state.

This is an explainable demo ranking, not a trained recommender or evidence of causal learning effectiveness. Career-goal matching is basic string inclusion. The default catalogue is synthetic and one job role is seeded (System Admin can define additional mappings); the weights need evaluation with approved real catalogue and learner data before production use.
