// The blog's posts, one list for the home page's strip, the blog page and post.html. A post is a film (a video) or
// a note (writing, with or without a picture). `img` is a real still of Sol; `cover` a drawn one until a still exists.
// Every post here happened: dates and facts come from the build (now.md, sol/README.md, the tracker). First drafts.
const POSTS = [
  { id:'dawn', kind:'film', date:'2026-10-26', len:'0:05', title:'Dawn: the first five minutes', cover:'dawn', video:'media/dawn.mp4',
    say:'Sol meets you. A door, a hello, the senses it asks for, and the minds you bring.',
    body:`<p>The first five minutes with a new app are usually a form. We wanted them to feel like a morning.</p>
      <p>Dawn is Sol's first run. A door opens, Sol says hello and asks what to call you. Then it asks for its senses, one at a time and each with a reason: the screen, the microphone, the files. Then the minds: you sign in to the AIs you already pay for, Claude and Codex, each in its own window, and Sol never sees a password.</p>
      <p>The last scene hands you the look. Move a slider and the whole window follows. By the time the sun is up, Sol is yours.</p>` },
  { id:'glass', kind:'film', date:'2026-10-26', len:'0:05', title:'The glass', img:'media/films/look-film.jpg', video:'media/films/look-film.mp4',
    say:'Why Sol is black glass over your desktop, and the day we settled on 0.78.',
    body:`<p>Sol is not a page in a browser. It sits over your desktop like a pane of dark glass: your wallpaper and your other windows stay faintly there behind it, so Sol feels like part of the Mac rather than another app on top of it.</p>
      <p>The whole look is one rule. There is one base colour at one opacity, black at 0.78 by default, with a blur behind it. Every surface is that same base laid again at a step: the sidebar, the chat, the pop-ups. Every word and line is the same white at an opacity. The only colour in the window is the glow of the AI you are talking to.</p>
      <p>Because it is one rule, it is yours to turn. Settings → Look holds the colour, the opacity, the blur and how your messages look, and the whole window follows.</p>` },
  { id:'blocks', kind:'note', date:'2026-10-24', len:'4 min', title:'Made of blocks', img:'media/buttons.png',
    say:'Everything in Sol is one kind of thing. Yours and ours are the same, so yours can replace ours.',
    body:`<p>Most apps have features and settings. Sol has blocks.</p>
      <p>A block is one thing, in one file: a button on your rail, a layout, a look. Sol's own blocks and the ones you make are the same kind of thing, so one of yours can stand in for one of ours by name. "Back to Sol's" is always one press away.</p>
      <p>You don't write blocks; you ask for them. Say what you need, and your agent picks the lightest way to make it, makes it, checks it, and loads it on its own so that if it breaks, it breaks alone. Every change goes in a log, so undo is one word, everywhere.</p>
      <p>This is how Sol grows into the shape of your days without becoming a mess.</p>` },
  { id:'beta', kind:'note', date:'2026-10-23', len:'2 min', title:'The beta is open', img:'media/minds.png',
    say:'One line in Terminal or one download. What to expect, and how to tell us what broke.',
    body:`<p>Sol is open to try. On a Mac, download it and open it, or paste one line in Terminal. On Linux, or Windows under WSL, the same line runs Sol in your browser.</p>
      <p>Two things to know. Sol runs the AIs you already pay for, so bring a Claude or ChatGPT account. And it is a beta: things will break. When they do, tell us on GitHub; the person who reads it is one of the three people building Sol.</p>` },
  { id:'glue', kind:'note', date:'2026-10-20', len:'3 min', title:'Stop being the glue',
    say:'Work lived in one app and life in another. Every AI made us the thing that carries context between them.',
    body:`<p>Count the AIs you used this week. A chat for questions, an agent for code, another for search, the one in your notes app, the one in your mail.</p>
      <p>Each is good at its thing. None of them knows what the others know. So you became the glue: you copy the answer from one, paste it into another, and explain your situation again, every time.</p>
      <p>Sol starts from one idea: you should talk to one thing. It keeps your context, reaches the AI that fits, and stays the same conversation wherever you reach it, at your desk, from the notch, or on your phone. And when you need something every day, it becomes a button that stays.</p>` },
  { id:'three', kind:'note', date:'2026-10-19', len:'2 min', title:'Three founders, their agents', cover:'three',
    say:'Sol is built by three people and their agents in one repository. How that works.',
    body:`<p>Sol began as one person's tool. Since October 19 it has three founders: Marco, Frank and Isaac.</p>
      <p>Each of us works with our own agents, in one shared repository. The rules are kept short and the machine checks them, so nobody has to remember them: work starts by claiming an issue, lands as a pull request with a note on how to try it, and someone else reads it before it goes in.</p>
      <p>Sol is also built for exactly this: a team and its agents working in one place. We are its first team.</p>` },
];

const DL = { mac:'https://github.com/marcocyl04-ux/sol-beta/releases/latest/download/Sol-mac.zip',
             line:'curl -fsSL https://marcocyl04-ux.github.io/sol-beta/install | sh' };
document.querySelectorAll('a[data-dl]').forEach(a => a.href = DL.mac);

const fmtDate = d => new Date(d + 'T12:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
const coverHTML = p => p.img ? `<img src="${p.img}" alt="">` : `<div class="cov ${p.cover || ''}"></div>`;

function postCard(p) {
  const a = document.createElement('a');
  a.className = 'post' + (p.img || p.cover || p.video ? '' : ' text');
  a.href = 'post.html?p=' + p.id;
  a.dataset.kind = p.kind;
  const media = p.video
    ? `<div class="media">${coverHTML(p)}<video src="${p.video}" muted loop playsinline preload="metadata"></video><span class="play">▶</span></div>`
    : `<div class="media">${coverHTML(p)}</div>`;
  a.innerHTML = `<span class="kind ${p.kind}"><i></i>${p.kind === 'film' ? 'Film' : 'Note'} · ${p.len}</span>${media}
    <div class="body"><small>${fmtDate(p.date)}</small><b>${p.title}</b><p>${p.say}</p></div>`;
  const v = a.querySelector('video');
  if (v) { a.onmouseenter = () => v.play().catch(() => {}); a.onmouseleave = () => v.pause(); }
  return a;
}

function openTheater(src) {
  const th = document.querySelector('.theater'), v = th.querySelector('video');
  v.src = src; th.classList.add('on'); v.play().catch(() => {});
  const close = () => { th.classList.remove('on'); v.pause(); };
  th.querySelector('.x').onclick = close;
  th.onclick = e => { if (e.target === th) close(); };
  addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once:true });
}
