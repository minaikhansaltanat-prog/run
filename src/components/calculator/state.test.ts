import { describe, expect, it } from "vitest";
import raw from "@config/pricing.json";
import { initialInput, parseParams, presetOf, PRESET_PACKAGES, reducer, toParams } from "./state";

describe("состояние калькулятора", () => {
  it("состав пресетов совпадает с config/pricing.json (нет расхождения констант и прайса)", () => {
    for (const k of Object.keys(PRESET_PACKAGES) as (keyof typeof PRESET_PACKAGES)[]) {
      expect([...PRESET_PACKAGES[k]].sort()).toEqual([...(raw.presets as Record<string, string[]>)[k]].sort());
    }
  });

  it("предвыбор из ссылок ТЗ: ?type=office&class=comfort&project=yes", () => {
    const r = parseParams(new URLSearchParams("type=office&class=comfort&project=yes"), initialInput());
    expect(r.hasParams).toBe(true);
    expect(r.input.objectType).toBe("office");
    expect(r.input.finishClass).toBe("comfort");
    expect(r.input.designProject).toBe("yes");
  });

  it("мусор в URL игнорируется, значения проверяются по спискам", () => {
    const r = parseParams(new URLSearchParams("type=<script>&class=gold&area=abc&baths=999&project=maybe&pkg=hack,rough"), initialInput());
    expect(r.input.objectType).toBe("apartment_new");
    expect(r.input.finishClass).toBe("comfort");
    expect(r.input.area).toBe(60);
    expect(r.input.packages).toEqual(["rough"]);
    expect(r.input.preset).toBe("custom");
  });

  it("псевдонимы типов объекта", () => {
    expect(parseParams(new URLSearchParams("type=apartment"), initialInput()).input.objectType).toBe("apartment_new");
    expect(parseParams(new URLSearchParams("type=cafe"), initialInput()).input.objectType).toBe("restaurant");
  });

  it("круговой обмен: состояние -> URL -> состояние", () => {
    let s = initialInput();
    s = reducer(s, {
      type: "patch",
      patch: { objectType: "restaurant", area: 120, finishClass: "premium", heatedFloor: "all", hvac: true, noElevator: true },
    });
    s = reducer(s, { type: "preset", preset: "finish_only" });
    const back = parseParams(toParams(s, 3), initialInput());
    expect(back.input).toEqual(s);
    expect(back.step).toBe(3);
  });

  it("пакеты: снятие делает пресет custom, возврат к составу пресета определяет его снова", () => {
    let s = initialInput();
    s = reducer(s, { type: "togglePackage", id: "tiling" });
    expect(s.preset).toBe("custom");
    s = reducer(s, { type: "togglePackage", id: "tiling" });
    expect(s.preset).toBe("turnkey");
    expect(presetOf(PRESET_PACKAGES.refresh)).toBe("refresh");
  });

  it("смена типа на квартиру сбрасывает вентиляцию и дополнительные поля", () => {
    let s = reducer(initialInput(), { type: "patch", patch: { objectType: "office", hvac: true, extras: { workstations: 20 } } });
    s = reducer(s, { type: "patch", patch: { objectType: "apartment_new" } });
    expect(s.hvac).toBe(false);
    expect(s.extras).toBeUndefined();
  });
});
