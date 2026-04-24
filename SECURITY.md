# Security Policy

## Supported Versions

This project is a client-side, single-page Pokemon battle simulator. There is
no backend, no authentication, no user data storage beyond browser `localStorage`
for team imports. The most recent commit on `main` is the only supported version.

| Version | Supported |
| ------- | --------- |
| `main` (latest) | Yes |
| Older commits | No |

## Reporting a Vulnerability

If you believe you have found a security issue in the simulator, please **do
not open a public GitHub issue**. Instead:

1. Open a [private security advisory](https://github.com/alfredocox/Pokemon-Champions-Sim-Planner/security/advisories/new) on this repository, or
2. Contact the maintainer via GitHub direct message.

Include:

- A clear description of the issue
- Steps to reproduce (team import, button sequence, console state, etc.)
- The browser and version you observed it in
- Your assessment of impact (data exposure, XSS, code execution, denial of service)

We will acknowledge the report within 7 days and aim to triage within 14 days.

## In Scope

- Cross-site scripting (XSS) via pokepaste / Showdown import parsing
- Arbitrary code execution via imported team data
- Prototype pollution in any imported payload
- Service worker cache poisoning
- Any way a malicious pokepaste URL can pivot to data exfiltration or persistent compromise

## Out of Scope

- Balance or mechanic accuracy concerns (file a regular issue with `mechanic` label)
- Reports that require the user to manually paste attacker-controlled JavaScript into the devtools console
- Denial of service via extremely large team imports (use the 6-Pokemon / 4-move input constraints)
- Social engineering of repository maintainers

## Safe Harbor

We will not pursue legal action against researchers who:

- Make a good-faith effort to avoid privacy violations, destruction of data, or interruption of service
- Give us reasonable time to address the issue before public disclosure
- Do not exploit the issue beyond what is necessary to demonstrate it
