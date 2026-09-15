# Curated MCP stories

Updated September 15, 2026. This readable export matches the 35 records served by the local MCP. Edit the source JSON and regenerate this export when changing content.

## R1 RCM: Agent Dispatch platform

R1 RCM | February 2026 - present

Personally designed and implemented the initial dispatch rewrite; the platform handles approximately 2 million accounts weekly.

**Strength:** Tim combines hands-on architecture with platform leadership: he personally built the initial dispatch rewrite, then enabled domain teams to extend it at roughly two million accounts per week.

Tim leads the Agent Dispatch team in healthcare accounts receivable. Accounts contain claims, remittances, and other information used to route work to humans or automated agents.

Before dedicated engineering support, Tim personally designed and implemented the initial rewrite of a Foundry-based dispatch system. The earlier system handled a subset of first-touch tasks. The rewrite supports initial routing and reevaluation when important account information changes.

A major obstacle was observability: understanding account volumes and explaining routing decisions took too long. Tim built a tree-like criteria engine that exposes which conditions were evaluated and where an account failed to qualify for a dispatch module.

Healthcare-system-specific configuration supports agent enablement and task allocation percentages. Eventing allows updated account information to trigger reevaluation.

Tim proposed giving domain teams ownership of their dispatch modules and advises them on integration. Within six months, four key stakeholders were building agents and modules. The appeals team is a major internal customer, using criteria and configuration to route accounts to its own agents. A separate labeling pipeline supplies classification capabilities; Tim did not claim ownership of that pipeline.

Tim subsequently gained a small engineering team and now leads ongoing platform development. Domain teams own their agents; the underlying agent infrastructure already existed.

Claim context

- The approximately 2 million accounts per week is current reported platform volume, not a measured increase caused by the rewrite. Distinct-account versus repeat-dispatch counting has not been specified.
- Four stakeholders should not be restated as four teams without confirmation. No supported aggregate labor-savings figure is available.

Source: Tim's experience interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#r1-dispatch)

## R1 RCM: AI support and shared investigation tools

R1 RCM | 2026

Designed and led delivery of a support agent resolving approximately 71% of channel conversations without an engineer reply.

**Strength:** Tim turned a recurring support burden into an AI-assisted workflow by originating the design, organizing delivery, and building shared investigation capabilities.

Business users and engineering teams ask dispatch and tasking questions in a Slack support channel. The agent retrieves code and system context, answers follow-up questions, and resolves conversations or leaves them for an assigned engineer.

Tim originated the idea, secured organizational permission and credentials, defined agent principles and tools, and delegated bot implementation to teammates. He did little of the bot implementation himself.

Tim also developed shared tools and infrastructure for retrieving data and answering questions, originally for dispatch support and also used by a general R1 support bot. This reuse is distinct from building the entire general R1 bot.

Approximately 71% of support conversations are resolved without a member of Tim's team replying. Common questions ask why a specific account was routed somewhere or why a task was opened. Human involvement is more often needed for feature requests, interpretation of platform capabilities, planning, and launch timelines.

Another bot pulls feedback-form support tickets from Azure DevOps. Tim also built Azure DevOps and Zendesk connections to send information to support teams.

Claim context

- The 71% figure measures conversations without an engineer response, not answer accuracy or absence of background review. Its measurement window and sample size have not been supplied.
- The separate 83% figure includes conversations ending with an agent resolution after possible human participation. It is not the no-human-response rate.
- The general R1 bot does not inherit dispatch's resolution metric. Exact packaging of shared infrastructure as an API service remains to be clarified.

Source: Tim's experience interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#r1-support)

## R1 RCM: ePARS external request automation

R1 RCM | 2026

Built an agent workflow handling a few hundred tasks daily, primarily requesting missing billing and patient information.

**Strength:** Tim made agent automation practical by doing the difficult integration work across Foundry, Azure authentication, and external systems.

The workflow sends an external request for missing account information and performs associated tasks when a response arrives. Current requests primarily concern patient and billing information, including claims and remittances.

Tim coordinated with the external system's team, configured Azure applications and authentication, arranged secure credential storage within Foundry, and configured VPN connectivity and header forwarding for authorization.

Tim implemented API connections, scheduling, and agent prompts. The connection and authentication work were the difficult parts; he describes the agent logic as straightforward.

This was the first integration of this kind from Tim's Foundry environment to their Azure environment. The agent works on a few hundred tasks daily.

Claim context

- Daily volume is approximate and does not establish successful completions or time savings. The ePARS acronym expansion is unknown.
- This is not a claim of the first such integration across all of R1 or of a specific security certification.

Source: Tim's experience interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#r1-epars)

## Included Health: Shared practitioner platform

Included Health | September 2024 - February 2026

Originated a shared practitioner platform that generalized two or three bespoke care flows into tens of configurable processes built by other teams.

**Strength:** Tim created reusable platform capabilities from fragmented care workflows, combining architectural direction, implementation, and enablement of other teams.

When Tim arrived, behavioral health and urgent care relied on hardcoded workflows rather than a shared practitioner platform. He originated the generalized design, led the project and team, implemented much of the code, and worked with the developer platform team on a Temporal-based foundation.

A service request starts a process with member context, including age, location, requested service, and insurance. Task execution adds information to that context and makes decisions about subsequent steps.

Tim designed the context model and task requirements: configurable trees embedded in task definitions. Requirements included practitioner licensing, supported service lines, and context-derived criteria such as whether a practitioner could see a member of a particular age.

His team owned the API that evaluated requirements and returned eligible practitioners. Domain teams could define processes and requirements for their own services. The platform grew from two or three bespoke flows to tens of processes.

The supplied resume reports support for five new clinical service lines within a year. That figure is distinct from the number of process definitions.

Claim context

- The five-service-line figure is from the supplied resume; tens of processes does not mean tens of service lines.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#included-health)

## Included Health: Event-driven routing and rollout

Included Health | September 2024 - February 2026

Led an event-driven router redesign after discovering contested matches, with reported matching within 500 ms once an eligible counterpart was available.

**Strength:** Tim used operational evidence to identify a routing problem, led a redesign, and planned a controlled cutover with explicit reliability tradeoffs.

While building routing dashboards to expand automatic task assignment, Tim discovered repeated contested matches in the distributed urgent-care router. Each contention added about ten seconds; unlucky members could wait more than ten additional minutes. Drop-off was relatively low; slow and unpredictable routing was the main problem.

Tim presented the diagnosis, proposed design, benefits, timeline, and cutover plan to leadership. The history mattered: an older router repeatedly rebuilt all routing state, and its distributed replacement had introduced contention. His design used event-triggered matching rather than returning to periodic full-state rebuilds.

The new router maintained separate prioritized task and practitioner queues and matched in memory when events occurred, such as joining a queue or insurance information changing. A Temporal-managed process coordinated each router.

The first implementation used a Temporal workflow as the routing source of truth. Tim had planned database locking from the outset, worked with the developer platform team to build support, and then introduced record-level locks so overlapping routers could coordinate assignments of tasks and practitioners.

The tradeoff was increased dependency on application database availability. The earlier workflow-managed matching could continue during some application database outages while its servers were running; the locking design needed that database for coordination.

Cutover used feature flags, registering participants in the new router and shutting down the old routing process while preserving original queue-entry times for prioritization. Each task and practitioner needed one routing owner during the transition.

Tim reported an 80% reduction in member wait times and matches within 500 ms once a compatible counterpart was available. Practitioners generally decided within ten seconds of being paged; the allowed response window was two minutes.

Claim context

- The 500 ms figure is conditional matching latency, not total time to care or a specified percentile/SLA. The ten-second figure is a practitioner decision, not guaranteed acceptance.
- Database locks are not evidence of an end-to-end exactly-once guarantee. The database-availability tradeoff concerns the application database, not a claim that Temporal requires no durable storage.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#included-health-router)

## Included Health: In-house scheduling and recurring shifts

Included Health | September 2024 - February 2026

Built in-house shift scheduling with immediate updates and recurring availability, supporting over 1,000 additional monthly bookings.

**Strength:** Tim connected platform engineering to service availability: recurring scheduling made it easier for practitioners to offer appointments and supported more bookings.

Athena-based scheduling relied on a roughly 30-minute sync and had overlapping-shift issues. Tim led and built an in-house shift system with recurring schedules, operations-managed scheduling, and opt-in practitioner self-scheduling.

The new system became the source of truth for shifts, with changes available immediately. Rollout moved feature-flagged practitioner cohorts first, then service lines and the remaining population.

Recurring shifts expanded availability, especially for behavioral-health practitioners who managed their own schedules. Tim attributed over 1,000 additional appointment bookings per month to that capability.

Shift edits required reattaching affected appointments to the correct overlapping shifts because the existing slot-generation design depended on those relationships.

Daylight saving time was the hardest implementation detail he recalled. The frontend supplied the scheduling timezone alongside timestamp data so recurring shifts followed the practitioner's scheduling timezone.

Tim also planned a separate redesign using materialized slots and a time-series approach, but did not implement that proposal before leaving.

Claim context

- The future slot-generation redesign was planned, not shipped. The 30-minute sync describes that integration, not a universal Athena limitation.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#included-health-scheduling)

## Included Health: Diagnosing duplicate appointment slots

Included Health | September 2024 - February 2026

Traced booking errors to overlapping shifts during a major system cutover and simplified the shift-reconstruction logic.

**Strength:** Tim can investigate unfamiliar production systems, find the underlying data problem, and simplify the implementation that caused it.

During the broader post-merger move from a Django monolith to Go services, booking errors increased. Tim investigated through Querybook and dashboards and identified overlapping shifts that produced duplicate appointment slots.

The legacy matcher included service-specific cases and complicated deduplication. Tim replaced that approach with chronologically sorted start/end events to reconstruct shifts more simply and efficiently.

This early mitigation preceded his in-house scheduling project and established his ability to investigate unfamiliar systems through data.

Claim context

- Tim did not own the entire post-merger migration. The old algorithm's recalled cubic complexity was not verified, so no formal complexity or benchmark claim is made.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#included-health-shift-incident)

## Included Health: Practitioner data ownership and onboarding

Included Health | September 2024 - February 2026

Designed practitioner data ownership and onboarding integrations, connecting Workday through Okta and SCIM while supporting a gradual legacy migration.

**Strength:** Tim brings cross-team data architecture judgment: he aligned ownership and onboarding integrations with how people actually maintained practitioner information.

Tim redesigned the practitioner domain to align more closely with FHIR and support automated onboarding. He worked with stakeholders to determine which systems should own different attributes and what users needed to manage.

He advocated keeping business-specific data in the practitioner application, where users could manage it without administrative access to Workday, and avoiding bidirectional synchronization with ambiguous ownership.

Tim wrote the initial integration design and implemented aspects of the SCIM server with teammates. Application engineering managed Workday and supplied required data through Okta for the practitioner system to consume.

Partner-hospital practitioners also needed to sign in through external identities via Okta and have their data synchronized without requiring Workday employee records.

Tim helped select a credentialing vendor, integrated APIs and change webhooks, and supported flags and notifications for practitioners or operations staff to review data requiring validation. Some verification was automated, while human review remained.

The migration design allowed service lines and roles to move gradually while legacy data still mapped into the new model. At departure, the overall program combined completed components with planned work; initial profile pages and response masking were completed.

Claim context

- This was partial FHIR alignment, not a claim of full conformance. The entire onboarding migration is not claimed complete.
- SCIM provisioning is distinct from the sign-in protocol. Exact federation protocols and onboarding-time savings were not supplied.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#included-health-data)

## Included Health: Default-hidden fields and relationship authorization

Included Health | September 2024 - February 2026

Designed Protobuf-based response masking with fields hidden by default, combined with practitioner-level relationship authorization.

**Strength:** Tim designed access control into the data model and response path, using default-hidden fields and relationship authorization rather than relying on each UI to hide sensitive data.

Tim designed permission annotations on Protobuf fields and a response resolver that applied access rules before returning data. It masked or omitted unauthorized values; some responses indicated that data existed without exposing it.

Access combined practitioner-level relationship-based authorization, ReBAC, with account permissions and field-specific requirements. A field annotation alone did not grant access to every practitioner.

Examples included care coordinators viewing schedules to help members book, managers viewing their practitioners' schedules and licenses, and restricting peer practitioners from viewing one another's data.

New fields without permission annotations stayed hidden by default. Tim designed this as a least-permission model.

The response masking component was completed. Tim had previously designed a similar annotation-based approach at Google and applied that design experience here.

Claim context

- Masking is not encryption. The examples do not imply coordinators could view all licensing data or that all managers could view all practitioners.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#included-health-permissions)

## Included Health: Extensible practitioner profiles

Included Health | September 2024 - February 2026

Designed a federated GraphQL extension model so teams could add profile sections and supported forms through shared UI components.

**Strength:** Tim builds platforms other teams can extend: shared GraphQL-driven profiles let domain teams deliver capabilities while retaining ownership of their data.

Tim designed common layouts and components driven by GraphQL configuration and data. Other services could contribute fields and sections through the federated graph, reducing custom frontend work when the existing components supported their needs.

The notifications team used the platform to add a practitioner-only setting for opting in or out of SMS reminders. Previously, restoring an accidental opt-out required support and an engineer changing the messaging backend.

Tim owned the platform design; the notifications team implemented its setting. The shared components rendered its checkbox and data in the settings page.

The expert medical opinion team could own its domain data and display it within shared practitioner profiles with less involvement from Tim's team. Its separate domain workflows were not all generated by this UI framework.

Claim context

- No particular GraphQL federation framework or measured development-time reduction was specified. New UI capabilities could still require frontend implementation.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#included-health-graphql)

## Included Health: Scheduling API for MCP clients

Included Health | September 2024 - February 2026

Adapted the scheduling API to work with an MCP server so supported AI clients could help schedule visits.

**Strength:** Tim has practical experience making existing scheduling capabilities usable through MCP, grounded in ownership of the underlying platform APIs.

Tim's primary contribution was preparing the scheduling API for integration with an MCP server supporting scheduling through clients such as ChatGPT and Claude.

This builds on his broader scheduling platform work. The detailed authentication, confirmation flow, and division of server implementation were not supplied.

Claim context

- The interview clarified API integration ownership; it does not establish sole ownership of a scheduling agent or the entire MCP server.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#included-health-mcp)

## Included Health: Coaching extensible platform design

Included Health | September 2024 - February 2026

Coached engineers to connect immediate features to the platform's longer-term direction through design reviews and project ownership.

**Strength:** Tim develops engineering judgment through real project work, coaching engineers to design extensible capabilities and understand system interactions.

Tim gave engineers problems to work through, then met to discuss their designs and presentations. When needed, he explained his reasoning about interactions between systems. He described supporting engineers progressing toward senior promotions.

In one example, a teammate designed automatic queue joining and timed practitioner breaks. Tim pushed the design toward reusable on-shift lifecycle transitions in Temporal so future statuses could share observability and metrics.

Extensibility was a recurring mentorship emphasis. The practitioner lifecycle remained his team's ownership domain, even when other teams contributed. Other platform areas, including task management, supported more domain-owned contributions.

The aim was to let the platform team review appropriate contributions and focus on shared capabilities rather than implementing every small adjustment.

Claim context

- Tim is not presented as the engineers' manager or sole cause of promotion. This specific teammate's promotion and measured impact were not supplied.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#included-health-mentorship)

## Google: Supplier onboarding and multi-site enrollment

Google | October 2021 - September 2024

Connected supplier onboarding to downstream systems and helped build multi-site enrollment under a shared profile.

**Strength:** Tim improved a core finance workflow by connecting supplier onboarding data across systems and supporting more complex multi-site suppliers.

Tim worked on internal finance tools, initially supplier onboarding and later broader supplier management. Operations reviewed supplier tax, banking, and legal information and manually re-entered it downstream.

His early project mapped data and integrated the API/SAP connection to send reviewed information automatically, eliminating manual re-entry rather than eliminating approval.

Tim also played a key role in designing and building multiple supplier sites within one enrollment, writing a design document and taking it through review. Suppliers could associate distinct sites, tax, and banking details with one profile.

The supplied resume reports coverage expanding to over 95% of suppliers and tax/banking synchronization dropping from five days to nearly instantaneous.

Claim context

- These metrics come from the supplied resume. Synchronization time is not total payment time. Over 95% coverage is retained rather than turning Tim's approximate recollection into an exact 100% claim.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#google-supplier)

## Google: Reusable Protobuf data-masking library

Google | October 2021 - September 2024

Designed annotation-based masking for supplier data that became a reusable library across multiple finance teams.

**Strength:** Tim turned a concrete data-access problem into a reusable library adopted by multiple finance teams, demonstrating impact beyond a single feature.

Different people within a supplier organization supplied different sensitive details. After entry, fields such as banking information needed masking when returned so other profile users would not automatically see their values.

Tim originated a Protobuf annotation-based response handler for this purpose. Multiple teams in the finance organization reused it as a library.

He later applied a similar design approach at Included Health. This represents experience carried between roles, not transfer of Google source code.

Claim context

- No adoption count, breach-elimination result, or encryption claim is established. Included Health's specific ReBAC and default-hidden policies are not assumed for Google.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#google-masking)

## Google: Supplier profile update reviews

Google | October 2021 - September 2024

Improved change comparisons and approval rules for supplier profile updates, followed by automatic SAP synchronization.

**Strength:** Tim made operational decisions easier to review and control by improving change visibility and approval authorization for supplier updates.

Tim worked on clearer diffs showing proposed profile updates, helping reviewers see exactly what changed.

The work improved authorization and rules for required approval counts and eligible reviewers. Approved updates synchronized automatically to an SAP product.

Tim described faster, more accurate reviews qualitatively. This is separate from adding contract reviews to the Buying Experience product.

Claim context

- Exact approval policies, SAP product name, and measured review-time or accuracy changes were not supplied.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#google-supplier-approvals)

## Google: Supplier messaging and intern mentorship

Google | October 2021 - September 2024

Designed a supplier messaging workflow and mentored the intern who implemented it.

**Strength:** Tim multiplied his impact through mentorship: he designed a useful supplier workflow and enabled an intern to implement it.

Tim defined the project design, structure, and setup, then mentored an intern who performed the implementation.

Operations could send messages within the application. Suppliers received email and could reply by email or follow a link to the enrollment interface.

The supplied resume attributes a reduction in average supplier resubmission time from eleven days to three days to the discussion capability.

Claim context

- Credit the intern with implementation. Resubmission time is not approval time, and the measurement method is not documented.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#google-supplier-messaging)

## Google: Unified Buying Experience and scoped authorization

Google | October 2021 - September 2024

Led frontend integration and designed cross-system authorization that unblocked a unified Buying Experience.

**Strength:** Tim led integration across application boundaries, combining frontend coordination with the authorization design needed to make a unified platform work.

Tim took ownership of the approvals product within the same team as his supplier work. Before the broader integration, he addressed technical debt and worked on migration from Angular Dart to Angular TypeScript.

He led integration of participating frontends, coordinating application readiness, domains, routing, and a cohesive experience. Teams reused frontend work from his team.

The main integration blocker was authentication. Teams needed to retain distinct SAP service-account permissions without broadly over-permissioning a shared account.

Tim wrote and presented a cross-team design for scoped access during login so users did not have to authenticate separately to each application. The implemented approach included middleware teams added to gRPC endpoints.

He led coordination meetings, guided teams, and implemented contracting-related features. He compared the authorization design to OAuth; a specific protocol or grant flow was not confirmed.

The supplied resume reports user satisfaction increasing by over 30% and millions of dollars in errors identified and corrected per quarter through the broader Buying Experience work.

Claim context

- The resume metrics lack a supplied methodology and should not be attributed solely to the authentication middleware. Tim led substantial integration work, not every application in the organization.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#google-buying)

## Google: Contract approvals in Buying Experience

Google | October 2021 - September 2024

Led contract integration into an approvals platform previously focused on purchase requests and purchase orders.

**Strength:** Tim extended an established approval platform to a new financial-document category, addressing reviewer coordination and contract-specific information.

Contracts previously used a separate approval system with less of the organization and control available in the shared approvals product.

The work added concurrent requests for reviews from multiple people, expanded rules for choosing reviewers or departments based on contract criteria, and added displays for contract-specific data.

The goal was to bring contracts into the existing financial-document review experience and reduce errors or missed issues that caused rework.

The supplied resume reports expansion to 100% of existing financial document use cases after cloud contract integration.

Claim context

- The 100% figure is a scoped claim about existing use cases, not every possible contract workflow. Exact prior product, rule semantics, and error-reduction measurements were not supplied.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#google-contracts)

## Credera: Upfront pricing for home-service projects

Credera | September 2020 - October 2021

Led engineering for an upfront-price experience for painting and roofing, from backend pricing integrations to a released frontend experiment.

**Strength:** Tim delivered across backend, frontend, and experimentation, turning defined requirements into an upfront-pricing experience that earned release through an A/B test.

For an unnamed home-services marketplace, Tim built support for managed projects where customers saw a price before contacting providers.

Product requirements and API choices were largely supplied. Tim investigated the existing system and built Java microservice pricing logic using material and location-specific labor-cost data.

He implemented the Vue.js experience from Figma designs, configured feature flags, and ran an A/B test using an Adobe product. The new experience performed better and was released.

Claim context

- The test metric and effect size were not supplied. This pricing project does not inherit the separate fulfillment project's 70% booking-time figure.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#credera-pricing)

## Credera: ML-assisted project fulfillment

Credera | September 2020 - October 2021

Led a two-engineer effort integrating professional search, ML scoring, project management, and feedback into fulfillment.

**Strength:** Tim led applied ML product delivery: he integrated an existing model into a working fulfillment system and led a second engineer through implementation.

After a customer selected a pre-priced project, the home-services marketplace needed project details and a suitable professional to complete it.

Tim owned most development and led one other engineer. The workflow combined project information and photos, search over a professional roster, and Zendesk project-management integrations.

He integrated a scoring model built by another team to rank professionals for projects. Project managers could rate professionals afterward to preserve information for future work.

The supplied resume reports a 70% reduction in booking time for this project.

Claim context

- Tim integrated the model; he did not claim to train or develop it. The rating-to-model feedback mechanism and metric methodology were not supplied. Client identity is withheld.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#credera)

## Credera: Staffing integrations and notification platform

Credera | September 2020 - October 2021

Built integration microservices and a new text-notification platform connecting staffing operations, onboarding, and time tracking.

**Strength:** Tim connected fragmented staffing workflows through integration services and a reusable notification platform, with attention to operational needs.

For an unnamed staffing company, Tim built integration services and data models connecting worker information, onboarding, and external systems such as Kronos, linking data to the correct people.

He built a text-notification platform that the client had not previously had, including phone-number setup and testing. Missed clock-in reminders were one of the initial use cases, alongside other operational notifications.

The supplied resume describes an event-driven migration supporting incremental replacement of legacy applicant-tracking and HR systems and near-real-time updates.

Tim also contributed a C# and Razor Pages job-board refresh, improving queries, filtering, and search for performance and ranking.

Claim context

- No measured attendance, search-performance, or notification-delivery gain was supplied. Missed clock-ins were not the platform's sole or main use case.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#credera-staffing)

## Credera: Legacy migration to Azure

Credera | September 2020 - October 2021

Helped migrate a staffing client's legacy on-premises systems to Azure VMs after ransomware affected its systems.

**Strength:** Tim has hands-on infrastructure migration experience, working with Azure VMs, networking, and IIS to move legacy systems into the cloud.

The team configured Azure VMs, migrated and deployed legacy workloads, and validated the migration. Tim gained hands-on experience with server infrastructure, networking, and Microsoft IIS configuration.

The newer microservices maintained by the team already ran on Azure. This project concerned the legacy environment.

Claim context

- Tim is not presented as the incident-response lead or sole infrastructure architect. Recovery time, downtime, and security-hardening outcomes were not supplied. Client identity is withheld.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#credera-cloud)

## Credera: CI/CD and trunk-based development

Credera | September 2020 - October 2021

Replaced a roughly day-long weekly packaging effort involving four engineers with automated packaging and one release verifier.

**Strength:** Tim improves engineering effectiveness and wins support with evidence: his demonstration led to CI/CD and trunk-based changes that removed a recurring four-engineer packaging burden.

Early on a staffing engagement, releases across dependent C# and NuGet components required roughly a full day from the four-person team at least weekly.

Tim identified branching and packaging practices as sources of toil and proposed a simpler workflow. After initial resistance, he built a demonstration in his own time and used it to win agreement.

He combined a move to trunk-based development with CI/CD automation, making it clearer where changes belonged and simplifying merging and deployment.

Afterward, packaging was largely automated. One person verified the packages and required checks, then triggered release.

Claim context

- The baseline is approximate recall. Remaining verification time was not supplied, so no percentage labor saving is calculated. Releases still had human verification.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#credera-ci)

## Avanade: Large-data visualization for drilling operations

Avanade | May 2019 - September 2020

Independently designed a desktop tool for exploring large Parquet datasets from drilling-rig data pipelines.

**Strength:** Tim independently designed a tool for making large datasets inspectable, showing early ownership of a complete developer-facing application.

The team processed IoT data from oil-drilling rigs. Tim made smaller routine changes to its Azure Durable Functions pipeline while learning the Azure environment.

His independently assigned project was the visualization tool. Users loaded Parquet files, explored relationships in a tree-like view, searched, and located sections of interest for inspection and validation.

The supplied resume describes a cross-platform desktop application using lazy loading to explore billions of rows.

Claim context

- The implementation language and exact access algorithm are not recalled. The resume's separate eleven-day pipeline improvement is a team/project-level historical claim not established as Tim's individual result. He did not claim to architect the pipeline. Client identity is withheld.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#avanade)

## Avanade: Microsoft purchasing product test automation

Avanade | May 2019 - September 2020

Owned test-case management and built the automated Selenium end-to-end suite for a Microsoft purchasing product rebuild.

**Strength:** Tim owned the quality process as well as automation, managing test cases and building the Selenium suite for a Microsoft product rebuild.

The team rebuilt a product for purchasing Microsoft consulting resources and projects for government cloud.

Tim owned the testing process, managed all project test cases, and created the Selenium end-to-end suite. He also made Angular frontend changes.

Authentication was a challenge in building the suite, though the solution is not recalled in the interview.

Claim context

- Managing all test cases does not establish that all were automated or that test coverage was 100%. The specific product and government-cloud environment were not supplied.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#avanade-microsoft)

## Naya Studio: Software ownership and business operations

Naya Studio / Arumi Moves LLC | Operating for about a year as of September 2026

As a 50% owner, built and manages the software supporting a Pilates studio's customer experience and operations.

**Strength:** Tim brings an owner's perspective to software: as a 50% business owner, he builds the systems used to operate the studio and shape its customer experience.

Naya Studio is the new brand for Arumi Moves LLC, not a separate business. Tim and his wife Arumi, who teaches Pilates, run the studio. Tim owns 50% and handles all software needs.

He built the website, administrative CRM, and automated payroll system. The custom software connects operations and supports branding and gamification across scheduling and purchasing.

AI analysis of incoming information helps prioritize work and keep operations current. It drafts email and text responses and generates marketing campaigns and suggestions.

Tim also manages administrative-staff hiring, coordinates contractors for studio buildout, and built furniture. Instructor hiring and teaching are not his stated responsibilities.

Claim context

- Drafted messages and campaign ideas are not claimed to be sent automatically. Revenue, retention, payroll execution details, and specific gamification mechanics were not supplied.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#naya-studio)

## Texas Sports Academy: Native student device platform

Texas Sports Academy | Dates not recorded

Built native MacBook management software used by over 1,000 students, with learning-based access rules and integrations for other teams.

**Strength:** Tim expanded a web-only organization into native device management and shipped a platform used by over 1,000 students, with reusable APIs for other teams.

The school's stack had been web-only. Tim built an on-device manager that reads dynamic rules and controls computer, application, and website access based on learning XP goals.

He introduced an MDM solution for baseline configuration and restrictions, while his custom manager handled dynamic decisions.

He built dashboards for device activity, health, installed versions, and devices needing updates.

Working with the Playcademy team, he gathered requirements and built a secure device-control API for actions such as remotely opening and closing applications.

Tim reported over 1,000 students using the device manager.

Claim context

- Students are not an exact device count. Specific MDM vendor, native language, authentication mechanisms, and learning outcomes were not supplied.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#tsa-devices)

## Texas Sports Academy: Enrollment and laptop fulfillment

Texas Sports Academy | Dates not recorded

Built fulfillment infrastructure supporting approximately 75 to 200 laptop shipments per week.

**Strength:** Tim built operational infrastructure that connects enrollment readiness to real-world fulfillment, supporting roughly 75 to 200 laptop shipments weekly.

Tim integrated bulk shipping-label ordering, delivery scheduling, and returns and replacement workflows for devices with technical issues. A dashboard helped track fulfillment.

Enrollment verification checked signed agreements, required upcoming-cohort student information, and a shipping address before completion and shipment. He integrated address validation into the parent form.

Automated text messages linked parents to the verification page to complete missing information.

The infrastructure supported approximately 75 to 200 laptop shipments weekly.

Claim context

- This is supported operational volume, not a measured increase caused by the software. Address validation is not a delivery guarantee.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#tsa-fulfillment)

## Texas Sports Academy: Custom office-hours video app

Texas Sports Academy | Dates not recorded

Built an initial Zoom SDK office-hours application that went live with about 50 students per call, three times daily.

**Strength:** Tim moved quickly from an identified need to a live custom video experience, reusing SDK expertise to support office hours, breakout rooms, and attendance.

The standard Zoom experience did not meet the team's needs for office hours supporting students behind on their schedules. Tim used prior Zoom SDK experience at Included Health to build a custom demo and first version quickly.

The application included breakout rooms and automatic attendance tracking when students joined.

The initial application progressed to live use, with approximately 50 students per call and three calls a day.

Claim context

- Session counts do not establish 150 unique students daily. Tim owns the initial implementation story, not every subsequent product change.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#tsa-calls)

## UT Health: Mobile support for new fathers

UT Health research team | Dates not recorded

Rebuilt the frontend and backend of a live Flutter app supporting new fathers, including bilingual content and automated releases.

**Strength:** Tim owned full-stack mobile delivery for a research application, including cross-platform releases, bilingual content, and features serving new fathers.

Tim took over a student-built application and owned frontend and backend development to improve the system. It supports a professor's research on helping new fathers navigate childbirth.

The Flutter application shipped on iOS and Android. Hospitals were one distribution channel, alongside other marketing.

Features include a budget planner for suggested pregnancy and baby needs, with monthly and one-time expenses before and after birth. Tim also implemented podcast support.

He added English and Spanish localization based on the phone's language and structured it for maintainability as content and features grew.

He automated releases for the mobile platforms and backend to simplify delivery.

Claim context

- The app is live, but no user count was supplied. No research authorship, clinical effectiveness, automatic translation, or hospital-record integration is claimed.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#ut-health)

## Awake Solar: CRM, installer app, and publishing

Awake Solar | Dates not recorded

Built a CRM and installer application, plus a Notion publishing workflow that let staff update articles without editing code.

**Strength:** Tim translated a small business's operational needs into practical software, replacing spreadsheets and making publishing possible without code changes.

Tim replaced disorganized spreadsheets with a tailored CRM linking customer profiles, projects, and attached files into a structured process.

He built an installer application for capturing project information and uploading photographs needed for permitting and related work.

A lightweight CMS let staff author Notion pages that appeared as website articles and were distributed to external article sites with backlinks.

The main authoring benefit was publishing and updating articles on demand without changing website code.

Claim context

- No automated permit submission or measured SEO, traffic, or revenue improvement was supplied.

Source: Tim's career interview, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#awake-solar)

## Open source: es-exec build and run tooling

Independent / Tim's Experiments | Public project; interview September 2026

Created es-exec for a nodemon-like server-development workflow with rebuilding built in, then maintained it through personal use and community contributions.

**Strength:** Tim turns his own development friction into tools others can use, then supports those tools through issues, reviews, and ongoing improvements.

Tim wanted native rebuild support for his own server development. es-exec combines esbuild-based building and application execution, with a CLI, API, and plugins.

He handled issues and reviewed pull requests, while adding features and fixes as his own needs evolved.

The npm API reported 25,225 downloads of @es-exec/esbuild-plugin-start and 16,263 of @es-exec/esbuild-plugin-serve for August 13 through September 11, 2026.

Claim context

- Downloads include automated installs and are not unique users. Package dependency counts overlap. The historical 850,000+ total in the resume has not been independently reconciled.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#open-source-es-exec)

## Open source: Developer tools, graphics, and learning materials

Independent / Tim's Experiments | Public sources reviewed September 2026

Publishes developer tools and exploratory projects, including Cloudflare binding tooling and a Three.js Rubik's Cube library.

**Strength:** Tim explores and publishes across developer tooling, graphics, and educational material, complementing his production engineering experience.

Public repositories and npm packages include ts-plugin-workers for generating Cloudflare Workers environment binding types from configuration, and three-rubiks-cube for a Three.js cube API.

His GitHub also contains introductory frontend and relational-database learning material, alongside further experiments. These listings indicate project topics, not a claim that every repository is a mature product.

The supplied resume reports over 850,000 downloads across open-source projects. The detailed es-exec story provides a dated, narrower npm usage snapshot.

Claim context

- The cumulative download total is a historical resume claim. GitHub forks are not evidence that Tim authored the upstream projects.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#projects)

## Google Tech Exchange: Project-based teaching

Google Tech Exchange | Dates not recorded

Taught a project-based course and regularly mentored students through their projects.

**Strength:** Tim has direct teaching experience, guiding students through project delivery with regular mentoring and accountability.

Tim participated in Google Tech Exchange, teaching the project-based course, meeting with students regularly, and helping keep their projects on track.

The supplied resume describes HBCU student mentorship and reports roughly 75% receiving internship opportunities.

Claim context

- The internship figure is a resume claim with an unspecified denominator and outcome definition. It does not establish that Tim alone caused placements.

Source: Tim's career interview, September 2026; supplied resume where explicitly noted

[Read in preview](http://127.0.0.1:4322/resume/mcp#google-tech-exchange)

## Career context, education, and role preferences

Career overview | Updated September 2026

Software Engineer resume titles with Staff/Principal role targets; education completion status is not confirmed.

**Strength:** Tim is targeting Staff and Principal opportunities with a track record of hands-on implementation, cross-team platform design, and mentoring.

Tim targets Staff and Principal engineering roles while preferring Software Engineer as the title on each resume entry. Leadership and scope are described through concrete project stories.

His supplied resume lists a University of Houston BBA in Information Systems with a Computer Science minor, dated 2019, and a Georgia Tech MS in Computer Science entry dated 2026. The completion status of the Georgia Tech degree has not been confirmed.

The record does not establish compensation expectations, work authorization, availability, or relocation preferences.

Claim context

- Do not assert that the Georgia Tech degree was completed. Staff/Principal are target roles, not a claim of those formal titles at every employer.

Source: Tim's interview and supplied resume, September 2026

[Read in preview](http://127.0.0.1:4322/resume/mcp#career-context)
