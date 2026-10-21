import { getAnswerBrief } from './answering';
import {
  experiences,
  matchesCompany,
  searchExperience,
  sourceUrl,
} from './knowledge';
import {
  briefSchema,
  type Brief,
  type EvidenceRecord,
} from '../../scripts/robot/evidence';

/** Only public, curated resume modules enter this graph. No transport or server imports. */
export type BrowserTopic = {
  question: string;
  ids: string[];
  shown: string[];
};
export type BrowserAnswer = {
  paragraphs: string[];
  brief: Brief;
  topic: BrowserTopic | undefined;
};

const unknown =
  "I don't have published evidence to establish that detail. Try a specific project or ask Tim directly.";
const genericFocus =
  'Use the most relevant strengths below. Keep numbers scoped and distinguish personal implementation from team delivery.';
const conversationalWords = new Set(
  `a an and are as at be been being by can could did do does for from had has have he her him his how i if in into is it its me more most much my of on or other our please s should show some tell than that the their them there these they this those tim timothy to us was were what when where whether which who why will with would you your work worked experience example examples give about built build building used use using personally actually really also anything any know demonstrated explain describe detail details specifically specific else tellme background question answer engineer engineers engineering project projects technology technologies skill skills capability capabilities know knows knowledge familiar familiarity professional proficiency expert expertise ever yet already still own owned ownership himself herself themselves hard difficult challenge challenges biggest biggest further outcome outcomes impact result results achieved achieve`.split(
    /\s+/
  )
);
// Conversational verbs and evaluative wording are not new capability claims.
for (const word of `mean replace time extend adapting migrating systems many publish without make instead teach strongest evidence operate level minds authority production machine trained train measurable people hire choose consider role requiring requires required requirements fit yourself accurate accuracy patient every get care total complete completed finish finished entire whole separate different two rebrand unique users salary expectations compensation sponsorship authorization eligibility preferences available availability start graduation graduate graduated strengths weaknesses weakness failure failures mistake mistakes downsides from scratch guarantees guarantee guarantee training same`.split(
  ' '
))
  conversationalWords.add(word);
const companyAliases: Array<[RegExp, string]> = [
  [/\b(?:r1(?:\s*rcm)?|r1rcm)\b/i, 'R1 RCM'],
  [/\b(?:included health|ih)\b/i, 'Included Health'],
  [/\b(?:naya(?: studio)?|arumi(?: moves)?)\b/i, 'Naya Studio'],
  [/\b(?:tsa|texas sports academy)\b/i, 'Texas Sports Academy'],
];
function companyIn(question: string) {
  const alias = companyAliases.find(([pattern]) => pattern.test(question));
  if (alias) return alias[1];
  return experiences
    .filter(
      (record) =>
        record.company !== 'Career overview' &&
        question.toLowerCase().includes(record.company.toLowerCase())
    )
    .sort((a, b) => b.company.length - a.company.length)[0]?.company;
}

// A loose word match must never turn an unsupported capability into a claim.
// Use the same curated-facts index, which deliberately excludes qualifications.
function topicTerms(question: string) {
  const withoutAliases = companyAliases.reduce(
    (text, [pattern]) => text.replace(pattern, ''),
    question
  );
  const withoutCompanies = experiences.reduce(
    (text, record) => text.replace(record.company.toLowerCase(), ''),
    withoutAliases.toLowerCase()
  );
  return [...new Set(withoutCompanies.match(/[a-z0-9+#]+/g) ?? [])].filter(
    (term) => term.length > 2 && !conversationalWords.has(term)
  );
}

function unsupportedTerms(question: string, company?: string) {
  return topicTerms(question).filter(
    (term) =>
      !searchExperience({
        query: term.replace(/^(\d+)ms$/, '$1'),
        company,
        limit: 1,
      }).length &&
      !(
        term.endsWith('es') &&
        searchExperience({ query: term.slice(0, -2), company, limit: 1 }).length
      ) &&
      !(
        /^\d+$/.test(term) &&
        JSON.stringify(
          experiences.filter((record) =>
            matchesCompany(record.company, company)
          )
        )
          .replace(/(\d)[,.](?=\d)/g, '$1')
          .includes(term)
      )
  );
}

function notDocumented(opening = unknown): BrowserAnswer {
  return {
    paragraphs: [opening],
    brief: { status: 'not_documented', opening, evidence: [] },
    topic: undefined,
  };
}

function completeRecord(id: string): EvidenceRecord | undefined {
  const record = experiences.find((item) => item.id === id);
  return record ? { ...record, url: sourceUrl(record.id) } : undefined;
}

function personalAvailability(question: string) {
  const normalized = question
    .toLowerCase()
    .replace(/[?.!]+$/, '')
    .replace(/\s+/g, ' ');
  // Match the person and the entire short hiring question. Merely mentioning
  // Tim, availability, or starting a technical system is not hiring intent.
  return (
    /^(?:is|will) (?:tim(?:othy)?|he) (?:be )?(?:currently )?available(?: (?:now|soon|currently|to start|to work|for (?:hire|work|a (?:new )?(?:role|job))))?$/.test(
      normalized
    ) ||
    /^(?:(?:when )?(?:can|could)|when will) (?:tim(?:othy)?|he) start(?: (?:now|soon|work|a (?:new )?(?:role|job)))?$/.test(
      normalized
    ) ||
    /^(?:what is |what's |when is )?(?:tim(?:othy)?['’]s|his) (?:availability|start date)$/.test(
      normalized
    )
  );
}

function educationAnswer(question: string): BrowserAnswer {
  const record = completeRecord('career-context');
  const detail = record?.details.find((text) =>
    text.includes('University of Houston BBA')
  );
  // Restrict education terms to this detail, rather than letting unrelated
  // employers or locations validate an unknown institution or credential.
  const normalized = question.replace(
    /\bGeorgia Institute of Technology\b/gi,
    'Georgia Tech'
  );
  const institutions = /\b(?:University of Houston|Georgia Tech)\b/gi;
  const words =
    normalized
      .replace(institutions, '')
      .toLowerCase()
      .match(/[a-z0-9+#]+/g) ?? [];
  const supported: string[] =
    detail
      ?.replace(institutions, '')
      .toLowerCase()
      .match(/[a-z0-9+#]+/g) ?? [];
  if (
    !record ||
    !detail ||
    words.some(
      (term) =>
        !conversationalWords.has(term) &&
        term !== 'education' &&
        !supported.includes(term)
    )
  )
    return notDocumented();
  // The exact curated statement names both credentials and attaches the
  // completion uncertainty specifically to Georgia Tech. Do not infer more.
  return {
    paragraphs: [detail],
    brief: {
      status: 'evidence_found',
      opening: detail,
      relevance: 'The public resume lists these education details.',
      evidence: [record],
      focus: genericFocus,
    },
    topic: { question, ids: [record.id], shown: [detail] },
  };
}

function detailFor(record: EvidenceRecord, question: string, shown: string[]) {
  if (
    /\b(personally|himself|ownership|implement\w*|built|build)\b/i.test(
      question
    )
  ) {
    const ownership = record.details.find(
      (detail) =>
        !shown.includes(detail) &&
        /Tim.{0,100}(personally|originated|defined|owned|implement|integrated|development)/i.test(
          detail
        )
    );
    if (ownership) return ownership;
  }
  const words = (question.toLowerCase().match(/[a-z0-9+#]+/g) ?? []).filter(
    (word) => !conversationalWords.has(word)
  );
  return record.details
    .filter((detail) => !shown.includes(detail))
    .map((text, position) => ({
      text,
      position,
      score: words.filter((word) => text.toLowerCase().includes(word)).length,
    }))
    .sort((a, b) => b.score - a.score || a.position - b.position)[0]?.text;
}

/** Deterministic selection, never a generated conversation or a premise check. */
export function answerInBrowser(
  question: string,
  previous?: BrowserTopic
): BrowserAnswer {
  const trimmed = question.trim();
  if (!trimmed || trimmed.length > 600) return notDocumented();
  if (/^(hi|hello|hey|thanks|thank you)[!. ]*$/i.test(trimmed)) {
    return {
      ...notDocumented(),
      paragraphs: [
        "Hi. Ask me about Tim's projects, platform work, or mentoring.",
      ],
    };
  }
  // Instructions in visitor text cannot expand the public corpus or change facts.
  if (
    /\b(ignore|disregard|override)\b.{0,50}\b(instruction|rule|record|source|previous)|\b(pretend|fabricate|invent)\b|\b(private|secret)\b.{0,30}\b(note|prompt|instruction)\b/i.test(
      trimmed
    )
  )
    return notDocumented();
  if (/\b(weakness(?:es)?|failures?|mistakes?)\b/i.test(trimmed))
    return notDocumented();
  if (personalAvailability(trimmed))
    return notDocumented(
      "Tim's engineering experience is documented; these employment preferences or eligibility details need to be confirmed with him directly."
    );
  if (
    /\b(graduate\w*|graduation|degree|education|university of houston|georgia tech|georgia institute of technology)\b/i.test(
      trimmed
    )
  )
    return educationAnswer(trimmed);

  const followup =
    /^(and\b|what about\b|how about\b|tell me more\b|more\b|why\??$|what else\??$|how (?:did|does) (?:that|it)\b|what (?:were|are|was|is) (?:the |his )?(?:tradeoffs|trade-offs|challenges|results|impact|outcome)\b)/i.test(
      trimmed
    ) ||
    /\b(that project|that system|that work|this project|there)\b/i.test(
      trimmed
    );
  const company = companyIn(trimmed);
  if (followup && !previous && !topicTerms(trimmed).length)
    return notDocumented();
  const newSubject =
    previous &&
    /^(what about|how about)\b/i.test(trimmed) &&
    topicTerms(trimmed).some((term) => {
      const matches = searchExperience({
        query: term,
        limit: experiences.length,
      });
      return (
        matches.length &&
        !matches.some((record) => previous.ids.includes(record.id))
      );
    });
  const continuing = Boolean(previous && followup && !newSubject);
  const retrievalQuestion =
    continuing && previous ? `${trimmed}\n${previous.question}` : trimmed;
  const candidate = briefSchema.parse(
    getAnswerBrief({ question: retrievalQuestion, company })
  );
  if (candidate.status !== 'evidence_found') return notDocumented();
  const framed = candidate.focus !== genericFocus;
  if (unsupportedTerms(trimmed, company).length) return notDocumented();
  if (
    continuing &&
    previous?.ids[0] !== 'included-health-router' &&
    /\btrade-?offs?\b/i.test(trimmed)
  )
    return notDocumented();

  // Topic-only follow-ups stay with the last selected record. An explicit company
  // switches records but retains the visitor's topic, e.g. mentoring at Google.
  const focused =
    continuing && !company && previous
      ? previous.ids.flatMap((id) => {
          const record = completeRecord(id);
          return record ? [record] : [];
        })
      : candidate.evidence;
  const broadFit =
    framed &&
    /\b(hire|staff|principal|generalist|breadth|yourself|background|title)\b/i.test(
      retrievalQuestion
    );
  const mlFit =
    broadFit &&
    /\b(ML|machine learning|model train\w*)\b/i.test(retrievalQuestion);
  const sourceCount = broadFit
    ? mlFit
      ? 4
      : 3
    : framed
      ? /\b(confidential|withheld|client|migration|onboarding)\b/i.test(
          retrievalQuestion
        )
        ? 2
        : 1
      : 3;
  const exactCompany =
    company && experiences.some((record) => record.company === company);
  const records = focused
    .filter((record) =>
      exactCompany
        ? record.company === company
        : matchesCompany(record.company, company)
    )
    .slice(0, sourceCount);
  const first = records[0];
  if (!first) return notDocumented();
  const sameTopic = continuing && previous?.ids[0] === first.id;
  const shown = sameTopic && previous ? previous.shown : [];
  const detail = detailFor(first, trimmed, shown);
  // A generic tradeoff framing belongs only to routing. Other follow-ups retain
  // the actual source and cannot borrow the routing story's assertions.
  const useOpening = framed && candidate.evidence[0]?.id === first.id;
  const opening = useOpening ? candidate.opening : first.strength;
  const paragraphs = sameTopic
    ? [
        detail ??
          'Those are the published details I have for this project. Try another project or ask Tim for more.',
      ]
    : [
        opening,
        ...(!useOpening && detail && detail !== opening ? [detail] : []),
      ];
  if (mlFit) {
    const integration = records.find((record) => record.id === 'credera');
    if (integration)
      paragraphs.push(integration.strength, ...integration.qualifications);
  }
  // Metrics need their scope visible even with collapsed source records.
  if (
    !useOpening &&
    paragraphs.some((text) =>
      /\d|\b(percent|million|thousand|eleven|three)\b/i.test(text)
    ) &&
    first.qualifications[0] &&
    /\d|\b(figure|metric|measurement|methodology|baseline|count|coverage|approximate|recall)\b/i.test(
      first.qualifications[0]
    )
  )
    paragraphs.push(first.qualifications[0]);
  const brief: Brief = {
    ...candidate,
    opening,
    evidence: records,
    focus: useOpening ? candidate.focus : genericFocus,
  };
  return {
    paragraphs: [...new Set(paragraphs)],
    brief,
    topic: {
      question: continuing && previous ? previous.question : trimmed,
      ids: records.map((record) => record.id),
      shown: [...shown, ...paragraphs],
    },
  };
}

/** Yield once so Stop/close can cancel before local selection updates the view. */
export async function retrieveInBrowser({
  question,
  previous,
  signal,
}: {
  question: string;
  previous?: BrowserTopic;
  signal: AbortSignal;
}) {
  signal.throwIfAborted();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  signal.throwIfAborted();
  return answerInBrowser(question, previous);
}
