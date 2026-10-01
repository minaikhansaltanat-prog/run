// PDF "Предварительная смета RUH Construction" (ТЗ 13.6): логотип, параметры, разбивка, что входит и не входит,
// допущения, дисклеймер, контакты и QR на WhatsApp. Шрифты с кириллицей и казахскими буквами встроены (src/fonts/pdf).
import path from "node:path";
import fs from "node:fs";
import QRCode from "qrcode";
import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import ru from "@content/ru.json";
import kk from "@content/kk.json";
import { formatNumber, plain } from "@/lib/estimate/format";
import type { Pricing } from "@/lib/estimate/schema";
import type { BreakdownGroup, EstimateInput, EstimateResult } from "@/lib/estimate/types";
import { site, whatsappLink } from "@config/site";

type Messages = typeof ru;
const MSG: Record<"ru" | "kk", Messages> = { ru, kk: kk as unknown as Messages };

const root = process.cwd();
const fontDir = path.join(root, "src", "fonts", "pdf");
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Onest",
    fonts: [
      { src: path.join(fontDir, "Onest-Regular.ttf"), fontWeight: 400 },
      { src: path.join(fontDir, "Onest-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({ family: "Playfair", src: path.join(fontDir, "PlayfairDisplay-Medium.ttf") });
  // без переносов слов по слогам: в казахском и русском тексте они дают некрасивые разрывы
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

const C = { ink: "#0F0F11", gold: "#FFC700", muted: "#5B5B62", line: "#E3E3E6", paper: "#F8F9FA", orange: "#FAAE3B" };
const GROUP_COLOR: Record<BreakdownGroup, string> = { prep: C.ink, engineering: "#3A3A41", finishing: C.gold, logistics: C.orange };

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 30, paddingHorizontal: 40, fontFamily: "Onest", fontSize: 9, color: C.ink, lineHeight: 1.35 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  logo: { width: 158, height: 42, objectFit: "contain" },
  headRight: { alignItems: "flex-end" },
  title: { fontFamily: "Playfair", fontSize: 19, lineHeight: 1.3, marginBottom: 6 },
  meta: { color: C.muted, fontSize: 9 },
  test: { backgroundColor: "#FDECEA", color: "#C62828", padding: 6, marginBottom: 12, fontSize: 8.5, fontWeight: 700 },
  box: { backgroundColor: C.ink, borderRadius: 10, paddingVertical: 14, paddingHorizontal: 18, marginBottom: 12 },
  boxLabel: { color: C.gold, fontSize: 8, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 6 },
  boxRange: { color: C.gold, fontFamily: "Onest", fontWeight: 700, fontSize: 21, lineHeight: 1.25, marginBottom: 4 },
  boxSub: { color: "#D9D9DD", fontSize: 10 },
  h: { fontFamily: "Playfair", fontSize: 12.5, lineHeight: 1.3, marginBottom: 5, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 12, borderTopWidth: 1, borderTopColor: C.line },
  cell: {
    width: "50%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingRight: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  cellK: { color: C.muted, flex: 1, paddingRight: 8 },
  cellV: { fontWeight: 700, textAlign: "right", maxWidth: "52%" },
  bdRow: { marginBottom: 5 },
  bdTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  bdBar: { height: 6, backgroundColor: C.paper, borderRadius: 3 },
  bdFill: { height: 6, borderRadius: 3 },
  cols: { flexDirection: "row", gap: 18, marginBottom: 6 },
  col: { flex: 1 },
  li: { flexDirection: "row", marginBottom: 1.5 },
  bullet: { width: 9, color: C.orange, fontWeight: 700 },
  small: { fontSize: 8.5, color: C.muted },
  foot: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.line,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  qr: { width: 66, height: 66 },
  qrCol: { alignItems: "center", width: 90 },
  disclaimer: { marginTop: 10, fontSize: 8.5, color: C.muted },
});

interface Props {
  input: EstimateInput;
  result: Extract<EstimateResult, { status: "ok" }>;
  pricing: Pricing;
  locale: "ru" | "kk";
  calcId: string;
  clientName?: string;
  qrDataUrl: string;
  logo: Buffer;
  date: string;
}

const lower = (x: string) => x.charAt(0).toLowerCase() + x.slice(1);

function EstimateDoc({ input, result, pricing, locale, calcId, clientName, qrDataUrl, logo, date }: Props) {
  const m = MSG[locale];
  const t = m.calc;
  const p = m.pdf;
  const rows: [string, string][] = [
    [t.live.summaryObject, t.objectType[input.objectType]],
    [t.condition.label, t.condition[input.condition]],
    [t.params.area, `${input.area} ${m.common.m2}`],
    [t.params.bathrooms, String(input.bathrooms)],
    [t.params.ceiling, input.ceiling === "low" ? t.params.ceilingLow : input.ceiling === "mid" ? t.params.ceilingMid : t.params.ceilingHigh],
    [
      t.params.designProject,
      input.designProject === "yes" ? t.params.projectYes : input.designProject === "progress" ? t.params.projectProgress : t.params.projectNo,
    ],
    [t.scope.presetLabel, t.scope[input.preset]],
    [t.class.label, t.class[input.finishClass]],
    [t.materials.label, input.materials === "ruh" ? t.materials.ruh : t.materials.client],
  ];
  if (input.heatedFloor !== "none") rows.push([t.scope.heatedFloor, input.heatedFloor === "bathrooms" ? t.scope.heatedBath : t.scope.heatedAll]);
  if (input.layout !== "none")
    rows.push([t.scope.layout, t.scope[`layout${input.layout[0].toUpperCase()}${input.layout.slice(1)}` as "layoutSmall"]]);
  if (input.hvac) rows.push([t.scope.hvac, p.yes]);

  const notIncluded = ["furniture", "appliances", "fixtures", "design", "approvals"] as const;

  return (
    <Document title={`${p.title} ${calcId}`} author="RUH Construction" language={locale}>
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <Image src={logo} style={s.logo} />
          <View style={s.headRight}>
            <Text style={s.title}>{p.title}</Text>
            <Text style={s.meta}>
              {p.number} {calcId}
            </Text>
            <Text style={s.meta}>
              {p.date}: {date}
            </Text>
            {clientName ? (
              <Text style={s.meta}>
                {p.clientLabel}: {clientName}
              </Text>
            ) : null}
          </View>
        </View>

        {!pricing.pricingApproved && <Text style={s.test}>{p.testPrice}</Text>}

        <View style={s.box}>
          <Text style={s.boxLabel}>{p.rangeLabel}</Text>
          <Text style={s.boxRange}>
            {plain(t.result.range.replace("{low}", formatNumber(result.low)).replace("{high}", formatNumber(result.high)))}
          </Text>
          <Text style={s.boxSub}>
            {p.perM2Label}: {plain(formatNumber(result.perM2Low))} - {plain(formatNumber(result.perM2High))} {m.common.perM2}
          </Text>
        </View>

        <Text style={s.h}>{p.objectSection}</Text>
        <View style={s.grid}>
          {rows.map(([k, v]) => (
            <View key={k} style={s.cell}>
              <Text style={s.cellK}>{k}</Text>
              <Text style={s.cellV}>{v}</Text>
            </View>
          ))}
        </View>

        <Text style={s.h}>{p.breakdown}</Text>
        {result.breakdown.map((b) => (
          <View key={b.group} style={s.bdRow}>
            <View style={s.bdTop}>
              <Text>{t.result.groups[b.group]}</Text>
              <Text>
                {plain(formatNumber(b.amount))} {m.common.currency} ({Math.round(b.sharePct)}%)
              </Text>
            </View>
            <View style={s.bdBar}>
              <View style={[s.bdFill, { width: `${Math.max(2, b.sharePct)}%`, backgroundColor: GROUP_COLOR[b.group] }]} />
            </View>
          </View>
        ))}
        {result.timeline && (
          <Text style={{ marginTop: 4 }}>
            {p.timeline}: {result.timeline.weeksLow}-{result.timeline.weeksHigh} {p.weeks}
          </Text>
        )}

        <View style={s.cols} wrap={false}>
          <View style={s.col}>
            <Text style={s.h}>{p.included}</Text>
            {input.packages.map((id) => (
              <View key={id} style={s.li}>
                <Text style={s.bullet}>+</Text>
                <Text>{t.packages[id].title}</Text>
              </View>
            ))}
            {input.materials === "ruh" && (
              <View style={s.li}>
                <Text style={s.bullet}>+</Text>
                <Text>{t.result.includedExtra}</Text>
              </View>
            )}
          </View>
          <View style={s.col}>
            <Text style={s.h}>{p.notIncluded}</Text>
            {notIncluded.map((k) => (
              <View key={k} style={s.li}>
                <Text style={s.bullet}>-</Text>
                <Text>{t.result.notIncluded[k]}</Text>
              </View>
            ))}
          </View>
        </View>

        <View wrap={false}>
          <Text style={s.h}>{p.assumptions}</Text>
          {[p.a1, p.a2, p.a3].map((a, i) => (
            <View key={i} style={s.li}>
              <Text style={s.bullet}>{i + 1}.</Text>
              <Text style={{ flex: 1 }}>{a}</Text>
            </View>
          ))}
        </View>

        <View style={s.foot} wrap={false}>
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text style={[s.h, { marginTop: 0 }]}>{p.contacts}</Text>
            <Text>{m.footer.address}</Text>
            <Text>
              {site.phone.display} (WhatsApp, Telegram {site.telegramHandle})
            </Text>
            <Text>Instagram {site.instagramHandle}</Text>
          </View>
          <View style={s.qrCol}>
            <Image src={qrDataUrl} style={s.qr} />
            <Text style={[s.small, { textAlign: "center", marginTop: 3 }]}>{p.qr}</Text>
          </View>
        </View>

        <Text style={s.disclaimer}>{t.result.disclaimer}</Text>
        <Text style={s.small}>
          {p.priceVersion}: {pricing.version}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderEstimatePdf(args: Omit<Props, "qrDataUrl" | "logo" | "date"> & { date?: Date }): Promise<Buffer> {
  registerFonts();
  const waText = MSG[args.locale].calc.result.whatsappText
    .replace("{object}", lower(MSG[args.locale].calc.objectType[args.input.objectType]))
    .replace("{area}", String(args.input.area))
    .replace("{class}", MSG[args.locale].calc.class[args.input.finishClass])
    .replace("{range}", `${plain(formatNumber(args.result.low))} - ${plain(formatNumber(args.result.high))} ₸`);
  const qrDataUrl = await QRCode.toDataURL(whatsappLink(`${waText} (${args.calcId})`), {
    margin: 1,
    width: 240,
    color: { dark: "#0F0F11", light: "#FFFFFF" },
  });
  const logo = fs.readFileSync(path.join(root, "public", "brand", "logo-h-light.png"));
  const d = args.date ?? new Date();
  const date = `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
  return renderToBuffer(<EstimateDoc {...args} qrDataUrl={qrDataUrl} logo={logo} date={date} />);
}
