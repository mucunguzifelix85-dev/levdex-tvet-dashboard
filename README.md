# LuxDev · TVET Rwanda — project dashboard

Two-sided dashboard for the *Digital skills for quality TVET in Rwanda* project.

- **School records** — each school creates, edits and deletes its own record.
- **Executive dashboard** — read-only rollup of every record submitted.

No build step, no framework, no dependencies. Open `index.html` in a browser,
or drop the folder on any static host.

## Structure

```
tvet-dashboard/
├── index.html                  markup for both views + the record modal
├── assets/
│   ├── css/styles.css          all styling, tokens at the top
│   └── js/
│       ├── store.js            persistence adapter — swap this for your API
│       ├── data.js             model, seed data, validation, metrics
│       ├── ui.js               escaping, formatting, toast, SVG charts
│       ├── school.js           school view: table, filters, CRUD
│       ├── executive.js        executive view: KPIs, charts, rollups, flags
│       └── app.js              controller: state, routing, events, import/export
└── README.md
```

Scripts are plain `<script>` tags rather than ES modules so the app also runs
straight off the filesystem (`file://`) without a server.

## Data flow

`app.schools` is the single source of truth. Every mutation calls `app.commit()`,
which persists through `TVET.Store` and repaints both views. The executive
dashboard holds no state of its own — it recomputes from `app.schools` each time.

Derived values are never stored:

| Value | How it's computed |
|---|---|
| Delivery score | mean of installation %, training %, portal reach % |
| Flags | recalculated from every record on each repaint |
| Province rollup | grouped from records at render time |

## Connecting a backend

`assets/js/store.js` is the only file that touches persistence. It currently
tries the artifact storage API, then `localStorage`, then falls back to memory.
Replace the two methods:

```js
load: async function () {
  const res = await fetch('/api/schools');
  return res.json();
},
save: async function (data) {
  await fetch('/api/schools', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return true;
}
```

For per-school writes, move the call into `TVET.School.save()` and `remove()`
so you `POST /api/schools`, `PUT /api/schools/:id`, `DELETE /api/schools/:id`
instead of writing the whole array.

## Access control

The two views are only separated in the UI. Before this goes live, put auth in
front of it so a school user lands on `school` with their own record scoped to
them, and only RTB, RTTI and LuxDev staff can reach `exec`. `setView()` in
`app.js` is where you'd gate it.

## Placeholder data

Ships with 11 placeholder sites so the executive view has something to roll up.
They are named "Site 01 placeholder" and so on — they are not real schools.
Delete them, or import your own JSON, before showing this to anyone.

## Validation rules

Enforced in `TVET.Data.validate()`:

- computers installed ≤ computers delivered
- teachers trained ≤ teachers in post
- teachers certified ≤ teachers trained
- female students, inclusion count and portal-active students ≤ total enrolment
- school name required, contact email must contain `@`
