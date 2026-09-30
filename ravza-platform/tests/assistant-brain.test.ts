import test from "node:test";
import assert from "node:assert/strict";
import { answer, looksHealthy, describeAvailability, type BrainDeps } from "../lib/assistant-brain.ts";
import { emptyVisit } from "../lib/visit-conversation.ts";

const now = new Date("2026-09-27T10:00:00Z");
const slots = [
  { timeSlot: "07:20", window: "07:20-07:40", gender: "female" as const, available: 38 },
  { timeSlot: "08:00", window: "08:00-08:20", gender: "female" as const, available: 1 },
  { timeSlot: "01:20", window: "01:20-01:40", gender: "male" as const, available: "50+" as const },
];
const deps = (reply: string | Error, calls: string[] = []): BrainDeps => ({
  ai: async (messages) => {
    calls.push(messages.at(-1)!.content);
    if (reply instanceof Error) throw reply;
    return reply;
  },
  availability: async () => slots,
});
const five = { ...emptyVisit, personCount: 5 };

void test("karışık yanıtı yapay zekâya gitmeden doğru işlenir, cinsiyet uydurulmaz", async () => {
  const calls: string[] = [];
  const out = await answer({ message: "karışık", history: [], details: five, locale: "tr", now }, deps("Hepiniz erkeksiniz.", calls));
  assert.equal(calls.length, 0);
  assert.equal(out.source, "rules");
  assert.deepEqual([out.details.femaleCount, out.details.maleCount], [null, null]);
  assert.match(out.reply, /kaçı kadın, kaçı erkek/);
});

void test("serbest soruda yapay zekâ yanıt verir ama talep bilgilerini değiştiremez", async () => {
  const out = await answer(
    { message: "QR kodu nerede görünür?", history: [], details: five, locale: "tr", now },
    deps("QR bağlantınız talep sayfanızda görünür. 5 kişinin hepsi erkek olarak kaydedildi."),
  );
  assert.equal(out.source, "ai");
  assert.deepEqual(out.details, five);
});

void test("bozuk model çıktısında kural motoruna düşer", async () => {
  assert.equal(looksHealthy("!!!!!!!!!!!!!!!!!!!!"), false);
  assert.equal(looksHealthy("Randevu talebinizi formdan gönderebilirsiniz."), true);
  const out = await answer({ message: "QR kodu ne zaman gelir?", history: [], details: five, locale: "tr", now }, deps("!".repeat(400)));
  assert.equal(out.source, "fallback");
  assert.match(out.reply, /QR/);
});

void test("model hata verirse de yanıt verir", async () => {
  const out = await answer({ message: "Ücret ne kadar?", history: [], details: five, locale: "tr", now }, deps(new Error("down")));
  assert.equal(out.source, "fallback");
  assert.match(out.reply, /\$2\.50/);
});

void test("soru içindeki gün için canlı boş saatleri modele verir, talebe yazmaz", async () => {
  const calls: string[] = [];
  const details = { ...five, femaleCount: 2, maleCount: 3 };
  const out = await answer({ message: "5 ekimde boş saat var mı?", history: [], details, locale: "tr", now }, deps("Evet, var.", calls));
  assert.equal(out.availabilityDate, "2026-10-05");
  assert.equal(out.details.dateFrom, "");
  assert.match(calls[0], /Canlı boş saatler/);
  assert.match(calls[0], /07:20–07:40 \(38 boş\)/);
  assert.doesNotMatch(calls[0], /08:00–08:20/, "2 kadına yetmeyen saat listelenmez");
});

void test("tarih girilince kural motoru yanıtına gerçek boş saatler eklenir", async () => {
  const details = { ...five, femaleCount: 2, maleCount: 3 };
  const out = await answer({ message: "5 ekim", history: [], details, locale: "tr", now }, deps("kullanılmamalı"));
  assert.equal(out.source, "rules");
  assert.equal(out.details.dateFrom, "2026-10-05");
  assert.match(out.reply, /Erkek \(3 kişi\): 01:20–01:40 \(50\+ boş\)/);
});

void test("sabah süzgeci gece saatlerini ayırır", () => {
  const text = describeAvailability("2026-10-05", slots, { ...five, femaleCount: 1, maleCount: 4 }, "tr", "sabah boş var mı");
  assert.match(text, /sabah boş saatler/);
  assert.match(text, /Erkek: bu gün 4 kişilik boş saat görünmüyor/);
});

void test("ekip işareti gizlenir ve devir bayrağı açılır", async () => {
  const out = await answer({ message: "Vize için hangi belgeler gerekiyor?", history: [], details: five, locale: "tr", now }, deps("Bu konuda kesin bilgi veremiyorum. [EKIP]"));
  assert.equal(out.handoff, true);
  assert.doesNotMatch(out.reply, /\[EKIP\]/);
});

void test("gün doluysa en yakın uygun günü önerir", async () => {
  const details = { ...five, femaleCount: 2, maleCount: 3, dateFrom: "", dateTo: "" };
  const out = await answer(
    { message: "5 ekim", history: [], details, locale: "tr", now },
    {
      ai: null,
      availability: async (date) => (date === "2026-10-07" ? slots : []),
    },
  );
  assert.equal(out.availabilityDate, "2026-10-07");
  assert.match(out.reply, /En yakın uygun gün — 7 Ekim/);
  assert.match(out.reply, /günü değiştirebilirsiniz/);
});
