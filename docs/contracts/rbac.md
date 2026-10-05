# RBAC matrix
Production authority comes from verified server claims + current DB roles + active verified agency membership + jurisdiction/object ownership.

| Capability | Citizen | Agency operator | Agency coordinator | Intelligence | Publish-alert | Platform admin |
|---|---|---|---|---|---|---|
| Published unexpired warnings | Public | Public | Public | Public | Public | Public |
| Submit SOS | Own | Separate citizen grant | Separate citizen grant | Separate citizen grant | Separate citizen grant | Separate citizen grant |
| Private incident/location/messages | Own only | Assigned verified agency | Assigned verified agency | No automatic access | No automatic access | No automatic access |
| Unassigned coarse incident queue | No | Own jurisdiction | Own jurisdiction | No | No | No |
| Assign team | No | No | Suitable own verified agency | No | No | No |
| Update response states | No | Own agency | Own agency | No | No | No |
| Draft evidence-backed warning | No | No | No | Yes | Yes | No implicit grant |
| Publish warning | No | No | No | Separate publish grant | Yes | No implicit grant |
| Inspect telemetry/models | No | No current endpoint | No current endpoint | Yes | Separate intelligence grant | Yes |
| Agency verification/risk configuration/audit UI | Demo only | Demo only | Demo only | Demo only | Demo only | Proposed live admin boundary; endpoints pending |
| Recovery/coordination | No | Proposed scoped role | Proposed scoped role | Proposed reviewed findings | No implicit grant | No implicit incident access |

No super-admin bypass of precise citizen location is assumed. Break-glass access requires explicit justification, time limits, scope and audits before it can be implemented. The current browser demo switcher is not this matrix's enforcement. Worker database/broker credentials are separate machine capabilities; they do not grant citizen/agency roles.
