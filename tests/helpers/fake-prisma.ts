/**
 * Minimal in-memory stand-in for the parts of PrismaClient used by src/lib/notify.ts, for logic tests that
 * must run without a database. It enforces the same rules the real database does:
 *   - UNIQUE dedupeKey on NotificationLog and PRIMARY KEY date on DailyReport (violations throw code P2002)
 *   - updateMany() is an atomic compare-and-swap (count tells whether we won)
 * Every method yields to the event loop first, so concurrent callers genuinely interleave.
 */
type Row = Record<string, any>;
const tick = () => new Promise<void>((r) => setImmediate(r));

function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([k, cond]) => {
    const v = row[k];
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond) return cond.in.includes(v);
      if ('lt' in cond) return v < cond.lt;
      if ('gte' in cond) return v >= cond.gte;
      return true;
    }
    if (cond instanceof Date) return v instanceof Date && v.getTime() === cond.getTime();
    return v === cond;
  });
}

class UniqueError extends Error {
  code = 'P2002';
  constructor(m: string) { super(m); }
}

let seq = 0;
let clock = Date.now();
const stamp = () => new Date((clock += 1)); // strictly increasing, so updatedAt compare-and-swap is meaningful

class Model {
  rows: Row[] = [];
  constructor(private uniques: string[], private defaults: () => Row, private pk = 'id') {}

  private apply(row: Row, data: Row) {
    for (const [k, v] of Object.entries(data)) {
      row[k] = v && typeof v === 'object' && 'increment' in v ? (row[k] ?? 0) + v.increment : v;
    }
    row.updatedAt = stamp();
  }
  async create({ data }: { data: Row }) {
    await tick();
    const row = { ...this.defaults(), ...data };
    for (const u of [this.pk, ...this.uniques]) {
      if (row[u] != null && this.rows.some((r) => r[u] === row[u])) throw new UniqueError(`Unique constraint failed on ${u}`);
    }
    row.createdAt = row.createdAt ?? stamp();
    row.updatedAt = row.createdAt;
    this.rows.push(row);
    return { ...row };
  }
  async findUnique({ where }: { where: Row }) {
    await tick();
    const r = this.rows.find((x) => matches(x, where));
    return r ? { ...r } : null;
  }
  async findMany({ where, orderBy, take }: { where?: Row; orderBy?: Row; take?: number } = {}) {
    await tick();
    let out = this.rows.filter((r) => matches(r, where)).map((r) => ({ ...r }));
    if (orderBy) {
      const [k, dir] = Object.entries(orderBy)[0] as [string, string];
      out.sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (dir === 'desc' ? -1 : 1));
    }
    return take ? out.slice(0, take) : out;
  }
  async count({ where }: { where?: Row } = {}) {
    await tick();
    return this.rows.filter((r) => matches(r, where)).length;
  }
  async update({ where, data }: { where: Row; data: Row }) {
    await tick();
    const r = this.rows.find((x) => matches(x, where));
    if (!r) throw Object.assign(new Error('Record not found'), { code: 'P2025' });
    this.apply(r, data);
    return { ...r };
  }
  async updateMany({ where, data }: { where: Row; data: Row }) {
    await tick();
    const hit = this.rows.filter((r) => matches(r, where));
    hit.forEach((r) => this.apply(r, data));
    return { count: hit.length };
  }
}

const settingsDefaults = () => ({
  id: 1, clinicName: 'One Smile Dental Studio', doctorName: 'Doctor Ayesha', doctorPhone: '0332-3259577',
  assistantPhone: '0331-6256127', slotMinutes: 30, bookingEnabled: true, leadMinutes: 60, maxAdvanceDays: 60,
});

export class PrismaClient {
  appointment = new Model(['code', 'slotKey', 'submissionKey'], () => ({ id: `appt${++seq}`, status: 'PENDING' }));
  notificationLog = new Model(['dedupeKey'], () => ({ id: `log${++seq}`, status: 'PENDING', attempts: 0, error: null, providerMessageId: null, sentAt: null }));
  dailyReport = new Model([], () => ({ status: 'SENDING', total: 0, attempts: 0, error: null, providerMessageId: null, sentAt: null }), 'date');
  clinicSettings = {
    async upsert() { await tick(); return settingsDefaults(); },
  };
}
export const Prisma = {};
