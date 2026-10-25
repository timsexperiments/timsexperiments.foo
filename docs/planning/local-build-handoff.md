# Local lab build handoff

Branch: `feat/3d-site-transformation`. Preview: http://127.0.0.1:4321/. No production deployment.

The first-person night lab includes the original extruded logo, stars/moon lighting, keyboard and touch walking/look, recipe readers, a real JSON/Protobuf challenge, paper contact drafts with the flask stamp, and a conversational public-resume evidence panel. Homepage remains viewport-sized; panels scroll internally. The classic site remains at `/classic`.

Final validation: 199 tests passed. Astro check and production build passed. Browser audits exercised desktop/mobile layouts, all four scene targets, focus restoration, article/workbench flows, chat retrieval/retry/cancel, and newsletter integration. See final-integrated-audit.md and final-audit-fixes.md for evidence and limits.

Remaining decisions and limitations:

- Intro headline restored to “Good ideas start with an experiment.” Subheadline wording is still being discussed; current saved wording is not a final user-approved choice.
- Public-resume evidence is the dependable chat path. Optional local AI remains experimental; tested small models failed representative answer quality. Unsupported output is withheld. See browser-model-evaluation.md. Do not describe this as a reliable generative assistant.
- Direct contact delivery needs verified sender configuration. Until configured, the form honestly opens an email-app draft or copies the letter. No email/subscription was sent during testing.
- Browser challenge executes a bounded fixed serializer against editable data. A general browser container/code workspace is future work.
- Physical mobile keyboard/device behavior and screen-reader output remain unverified; touch tests used Chrome emulation. No claim of full accessibility conformance.

No further broad model search or repeated broad audits are needed for this checkpoint. Follow up on concrete user feedback and the decisions above.
