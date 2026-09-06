# Blue Current Pilot Release Candidate V100.3.43

## Status

V100.3.43 is the locally certifiable release candidate for the first controlled Chefs International pilot. It consolidates the protected Floor, Host, Service, Kitchen, Staff, authorization, lifecycle, rush, iPad, restaurant-configuration, and hosted-environment gates.

## One-command certification

Run `npm run certify:pilot` from the repository root. The command:

1. Runs the complete project validator.
2. Runs every protected V100.3 test from V100.3.10.3 through V100.3.42 in version order.
3. Stops immediately on the first failed gate.
4. Prints a final structured certificate only when every gate passes.

## Meaning of certification

Passing establishes a locked local software candidate. It does not prove the physical iPad walkthrough, populate the actual Chefs restaurant configuration, create hosted infrastructure, change DNS, deploy code, or activate a live pilot. Those remain explicit human-controlled gates.

## Change policy

After this lock, apply only evidence-backed pilot blockers, security/reliability corrections, configuration truth, or deployment necessities. Any code change requires rerunning `npm run certify:pilot` and issuing a new candidate identity.
