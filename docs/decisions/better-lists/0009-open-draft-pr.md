# 0009. Open A Draft Pull Request

- Date: 2026-11-22
- Status: accepted
- Decided by: Kareem
- Area: Better Lists
- Related: [SDK app and commands](0008-register-sdk-app-and-selection-commands.md)

## Context

The Better Lists implementation and isolated preview are ready for review.

## Exchange

- Kareem: "Create a PR .context/attachments/cgdSD1/PR instructions.md"
- Attached instructions: "The user likes the current state of the code." and "The user requested a draft PR."
- Agent: review and commit the workspace changes, push the existing branch, and open a draft against main.

## Decision

Submit the complete Better Lists workspace diff as a draft pull request from the existing branch. This requests review; it does not authorize merging or production deployment.

## Evidence

- [Implementation and verification](../../handoffs/2026-11-22-better-lists.md).
- Owner attachment: `.context/attachments/cgdSD1/PR instructions.md` (private workspace instructions, not part of the PR).
