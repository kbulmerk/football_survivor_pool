const SURVIVOR_RULES = [
  'Each week, pick one team you think will lose. If that team wins or ties, you’re eliminated.',
  'You can’t pick the same team twice in a season.',
  'Teams playing Tuesday through Saturday are not eligible to be picked that week.',
  'Picks are due by Saturday 11:59pm ET. If you miss the deadline, a team you haven’t used yet is auto-picked for you.',
  'Buy-in must be paid before Week 1 to be eligible to pick and participate.',
  'The pool continues until one player remains — or the remaining players unanimously agree to split the pot.',
  'If everyone still in gets eliminated the same week, that group can unanimously choose to split the pot or continue the following week.',
];

const SQUARES_RULES = [
  'Everyone must pay the buy-in before the signup deadline to be assigned squares.',
  'Squares are divided as evenly as possible among everyone who’s paid.',
  'If 100 squares can’t be split evenly, extra squares are randomly assigned to reach 100.',
  'Once signup closes, all squares are randomly assigned.',
  'Payouts for each quarter are posted above the grid, and the winner of each quarter is notified.',
];

function RuleCard({ eyebrow, title, rules }: { eyebrow: string; title: string; rules: string[] }) {
  return (
    <div className="ticket-card" style={{ marginTop: '16px' }}>
      <div style={{ padding: '9px 16px', background: 'var(--ink)' }}>
        <span className="f-mono" style={{ fontSize: '10px', letterSpacing: '2px', color: 'var(--gold)' }}>
          {eyebrow}
        </span>
      </div>
      <div style={{ borderTop: '2px dashed var(--hairline-dash)' }} />
      <div style={{ padding: '16px 17px' }}>
        <h2 className="f-oswald" style={{ fontWeight: 700, fontSize: '20px', textTransform: 'uppercase', color: 'var(--ink)', marginBottom: '12px' }}>
          {title}
        </h2>
        <ol style={{ display: 'flex', flexDirection: 'column', gap: '11px', listStyle: 'none', margin: 0, padding: 0 }}>
          {rules.map((rule, i) => (
            <li key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span
                className="f-mono"
                style={{ flexShrink: 0, fontSize: '11px', color: 'var(--varsity-red)', marginTop: '2px' }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="f-spectral" style={{ fontSize: '14px', color: '#3a2e1c', lineHeight: 1.5 }}>
                {rule}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function RulesPage() {
  return (
    <main style={{ padding: '22px 20px 16px', maxWidth: '560px', margin: '0 auto', width: '100%' }}>
      <div className="f-mono" style={{ fontSize: '10px', letterSpacing: '3px', color: 'var(--varsity-red)', textTransform: 'uppercase' }}>
        HOW TO PLAY
      </div>
      <h1 className="f-oswald" style={{ fontWeight: 700, fontSize: '34px', textTransform: 'uppercase', color: 'var(--ink)', lineHeight: 0.95, marginTop: '2px' }}>
        Rules
      </h1>

      <RuleCard eyebrow="SURVIVOR POOL" title="Survivor" rules={SURVIVOR_RULES} />
      <RuleCard eyebrow="SQUARES POOL" title="Squares" rules={SQUARES_RULES} />
    </main>
  );
}
