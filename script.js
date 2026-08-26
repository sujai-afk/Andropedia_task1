/* =========================================================
   CONFIG
   ========================================================= */
const COMMON_PASSWORDS = new Set([
  "password","123456","123456789","12345678","12345","1234567","qwerty",
  "abc123","password1","password123","letmein","monkey","iloveyou","admin",
  "welcome","111111","123123","dragon","master","login","princess","sunshine",
  "football","passw0rd","qwerty123","000000","1q2w3e4r","zaq1zaq1","trustno1"
]);

const KEYBOARD_ROWS = ["qwertyuiop","asdfghjkl","zxcvbnm","1234567890"];

/* =========================================================
   DOM REFERENCES
   ========================================================= */
const pwInput = document.getElementById('pwInput');
const toggleVis = document.getElementById('toggleVis');
const emptyState = document.getElementById('emptyState');
const results = document.getElementById('results');
const strengthLabel = document.getElementById('strengthLabel');
const scoreLabel = document.getElementById('scoreLabel');
const meterBar = document.getElementById('meterBar');
const checklistEl = document.getElementById('checklist');
const suggestionsBody = document.getElementById('suggestionsBody');

/* =========================================================
   CORE CHECKS
   Each function inspects one property of the password.
   Keeping these separate makes the scoring logic below
   readable and each rule easy to explain individually.
   ========================================================= */
function hasUpper(pw){ return /[A-Z]/.test(pw); }
function hasLower(pw){ return /[a-z]/.test(pw); }
function hasNumber(pw){ return /[0-9]/.test(pw); }
function hasSpecial(pw){ return /[^A-Za-z0-9]/.test(pw); }

function hasRepeatedChars(pw){
  // 3 or more of the SAME character in a row, e.g. "aaa", "111"
  return /(.)\1{2,}/.test(pw);
}

function hasSequentialPattern(pw){
  const lower = pw.toLowerCase();
  // numeric/alphabetic runs of 3+ ascending or descending, e.g. 123, cba
  for(let i=0; i<lower.length-2; i++){
    const a = lower.charCodeAt(i), b = lower.charCodeAt(i+1), c = lower.charCodeAt(i+2);
    if((b === a+1 && c === b+1) || (b === a-1 && c === b-1)) return true;
  }
  // common keyboard-row runs, e.g. qwerty, asdf
  for(const row of KEYBOARD_ROWS){
    for(let i=0; i<=row.length-3; i++){
      const chunk = row.slice(i, i+3);
      if(lower.includes(chunk)) return true;
    }
  }
  return false;
}

function isCommonPassword(pw){
  return COMMON_PASSWORDS.has(pw.toLowerCase());
}

function uniqueRatio(pw){
  return new Set(pw).size / pw.length;
}

/* =========================================================
   SCORING
   Custom-designed methodology (out of 100), documented in
   the README. Four components, each capped, so no single
   factor can dominate the result:

     Length        max 30
     Character mix max 40  (10 each: upper/lower/number/special)
     Diversity     max 10  (unique-character ratio)
     Pattern bonus max 20  (starts at 20, -10 per bad pattern found)

   Then two hard overrides for known-bad passwords, since a
   short/common password should never score as strong just
   because it technically contains a special character.
   ========================================================= */
function scorePassword(pw){
  if(pw.length === 0){
    return { score: 0, label: 'EMPTY', checks: null };
  }

  let score = 0;

  // --- length (max 30) ---
  let lengthPts = 0;
  if(pw.length >= 16) lengthPts = 30;
  else if(pw.length >= 12) lengthPts = 25;
  else if(pw.length >= 8) lengthPts = 15;
  else if(pw.length >= 6) lengthPts = 5;
  score += lengthPts;

  // --- character mix (max 40) ---
  const checks = {
    length: pw.length >= 12,
    upper: hasUpper(pw),
    lower: hasLower(pw),
    number: hasNumber(pw),
    special: hasSpecial(pw),
    noRepeat: !hasRepeatedChars(pw),
    noSequence: !hasSequentialPattern(pw),
    notCommon: !isCommonPassword(pw),
  };
  score += (checks.upper ? 10 : 0) + (checks.lower ? 10 : 0) +
           (checks.number ? 10 : 0) + (checks.special ? 10 : 0);

  // --- diversity (max 10) ---
  const ratio = uniqueRatio(pw);
  if(ratio >= 0.6) score += 10;
  else if(ratio >= 0.4) score += 5;

  // --- pattern bonus (max 20, deduct for bad patterns) ---
  // Repeats/sequences are weighted heavily: a password can look decent on
  // length + character mix and still be trivially guessable (e.g.
  // "aaaaaaaaaaaa" or "abcdefgh"), so a pattern hit here can zero this
  // component out entirely rather than just chipping a few points off.
  let patternPts = 20;
  if(!checks.noRepeat) patternPts -= 20;
  if(!checks.noSequence) patternPts -= 20;
  score += Math.max(0, patternPts);

  // --- hard overrides ---
  if(isCommonPassword(pw)) score = Math.min(score, 10);
  if(pw.length < 4) score = Math.min(score, 15);

  score = Math.max(0, Math.min(100, Math.round(score)));

  let label;
  if(score < 40) label = 'WEAK';
  else if(score < 70) label = 'MEDIUM';
  else label = 'STRONG';

  return { score, label, checks };
}

/* =========================================================
   FEEDBACK / SUGGESTIONS
   ========================================================= */
function buildSuggestions(pw, checks){
  const tips = [];
  if(pw.length < 12) tips.push('Use at least 12 characters.');
  if(!checks.upper) tips.push('Add an uppercase letter.');
  if(!checks.lower) tips.push('Add a lowercase letter.');
  if(!checks.number) tips.push('Add a number.');
  if(!checks.special) tips.push('Add a special character (e.g. ! @ # $).');
  if(!checks.noRepeat) tips.push('Avoid repeating the same character 3+ times in a row.');
  if(!checks.noSequence) tips.push('Avoid predictable sequences like "123" or "qwerty".');
  if(isCommonPassword(pw)) tips.push('This is a widely known common password — avoid it entirely.');
  return tips;
}

/* =========================================================
   RENDER
   ========================================================= */
const CHECK_LABELS = [
  ['length', '12+ characters'],
  ['upper', 'Uppercase letters'],
  ['lower', 'Lowercase letters'],
  ['number', 'Numbers'],
  ['special', 'Special characters'],
  ['noRepeat', 'No repeated characters'],
  ['noSequence', 'No predictable sequence'],
  ['notCommon', 'Not a common password'],
];

function render(pw){
  if(pw.length === 0){
    emptyState.style.display = 'block';
    emptyState.textContent = 'Waiting for input...';
    results.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  results.style.display = 'block';

  const { score, label, checks } = scorePassword(pw);

  strengthLabel.textContent = `STRENGTH: ${label}`;
  strengthLabel.style.color = label === 'WEAK' ? 'var(--weak)' : label === 'MEDIUM' ? 'var(--medium)' : 'var(--strong)';
  scoreLabel.textContent = `${score} / 100`;

  const filled = Math.round(score / 10);
  const barColor = label === 'WEAK' ? 'var(--weak)' : label === 'MEDIUM' ? 'var(--medium)' : 'var(--strong)';
  [...meterBar.children].forEach((seg, i) => {
    seg.style.background = i < filled ? barColor : 'var(--line)';
  });

  checklistEl.innerHTML = '';
  CHECK_LABELS.forEach(([key, text]) => {
    const pass = checks[key];
    const li = document.createElement('li');
    li.className = pass ? 'pass' : 'fail';
    li.innerHTML = `<span class="mark">${pass ? '✓' : '✗'}</span> ${text}`;
    checklistEl.appendChild(li);
  });

  const tips = buildSuggestions(pw, checks);
  suggestionsBody.innerHTML = tips.length
    ? `<ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul>`
    : `<div class="none">✓ Strong password — no suggestions.</div>`;

  renderEntropy(pw);
  renderCrackTime(pw);
}

/* =========================================================
   BONUS: PASSWORD GENERATOR
   Uses crypto.getRandomValues (CSPRNG) rather than Math.random,
   since Math.random is not safe for generating secrets.
   ========================================================= */
const genLen = document.getElementById('genLen');
const lenVal = document.getElementById('lenVal');
const genBtn = document.getElementById('genBtn');
const genOut = document.getElementById('genOut');
const genNote = document.getElementById('genNote');
const copyBtn = document.getElementById('copyBtn');

genLen.addEventListener('input', () => lenVal.textContent = genLen.value);

function generatePassword(){
  const len = parseInt(genLen.value, 10);
  const useUpper = document.getElementById('optUpper').checked;
  const useLower = document.getElementById('optLower').checked;
  const useNum = document.getElementById('optNum').checked;
  const useSpec = document.getElementById('optSpec').checked;

  const sets = [];
  if(useUpper) sets.push('ABCDEFGHJKLMNPQRSTUVWXYZ');
  if(useLower) sets.push('abcdefghijkmnpqrstuvwxyz');
  if(useNum) sets.push('23456789');
  if(useSpec) sets.push('!@#$%^&*()-_=+[]{}');

  if(sets.length === 0){
    genOut.textContent = 'Select at least one character type';
    return;
  }

  const pool = sets.join('');
  const randomVals = new Uint32Array(len);
  crypto.getRandomValues(randomVals);

  let result = [];
  // guarantee at least one char from each selected set
  sets.forEach((set, i) => {
    result.push(set[randomVals[i] % set.length]);
  });
  for(let i = result.length; i < len; i++){
    result.push(pool[randomVals[i] % pool.length]);
  }
  // shuffle (Fisher-Yates) so guaranteed chars aren't always at the start
  const shuffleRand = new Uint32Array(result.length);
  crypto.getRandomValues(shuffleRand);
  for(let i = result.length - 1; i > 0; i--){
    const j = shuffleRand[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  genOut.textContent = result.join('');
  genNote.textContent = 'Generated with crypto.getRandomValues() (CSPRNG) — not Math.random(), which is not safe for secrets.';
}

genBtn.addEventListener('click', generatePassword);
copyBtn.addEventListener('click', () => {
  if(genOut.textContent && genOut.textContent !== '—'){
    navigator.clipboard.writeText(genOut.textContent);
    genNote.textContent = 'Copied to clipboard.';
  }
});

/* =========================================================
   BONUS: ENTROPY
   ========================================================= */
function renderEntropy(pw){
  let pool = 0;
  if(hasLower(pw)) pool += 26;
  if(hasUpper(pw)) pool += 26;
  if(hasNumber(pw)) pool += 10;
  if(hasSpecial(pw)) pool += 32;
  const bits = pool > 0 ? Math.round(pw.length * Math.log2(pool)) : 0;
  document.getElementById('entPool').textContent = pool;
  document.getElementById('entBits').textContent = `${bits} bits`;
}

/* =========================================================
   BONUS: CRACK-TIME ESTIMATE
   ========================================================= */
function formatSeconds(sec){
  if(!isFinite(sec)) return 'effectively never';
  if(sec < 1) return 'instantly';
  const units = [
    ['centuries', 3153600000], ['years', 31536000], ['days', 86400],
    ['hours', 3600], ['minutes', 60], ['seconds', 1]
  ];
  for(const [name, secs] of units){
    if(sec >= secs) return `~${(sec/secs).toFixed(1)} ${name}`;
  }
  return `${sec.toFixed(1)} seconds`;
}

function renderCrackTime(pw){
  let pool = 0;
  if(hasLower(pw)) pool += 26;
  if(hasUpper(pw)) pool += 26;
  if(hasNumber(pw)) pool += 10;
  if(hasSpecial(pw)) pool += 32;
  const combos = pool > 0 ? Math.pow(pool, pw.length) : 0;
  const avgGuesses = combos / 2;

  const offlineSec = avgGuesses / 10_000_000_000; // 10B guesses/sec
  const onlineSec = avgGuesses / 100;              // 100 guesses/sec

  // common/very short passwords are cracked instantly regardless of raw math
  const trivial = isCommonPassword(pw) || pw.length < 4;

  document.getElementById('crackOffline').textContent = trivial ? 'instantly' : formatSeconds(offlineSec);
  document.getElementById('crackOnline').textContent = trivial ? 'instantly' : formatSeconds(onlineSec);
}

/* =========================================================
   EVENTS
   ========================================================= */
pwInput.addEventListener('input', () => render(pwInput.value));

toggleVis.addEventListener('click', () => {
  pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
});

document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tabpanel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// initial state
render('');
