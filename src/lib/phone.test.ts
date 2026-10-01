import { describe, expect, it } from "vitest";
import { isValidPhone, maskPhone, maskPhoneOnChange, nationalDigits, toE164 } from "./phone";

describe("телефон +7", () => {
  it("маска при вводе с префиксом", () => {
    expect(maskPhone("+7 7")).toBe("+7 7");
    expect(maskPhone("+7 777923")).toBe("+7 777 923");
    expect(maskPhone("+7 7779233331")).toBe("+7 777 923 33 31");
  });
  it("вставка в разных форматах дает один номер", () => {
    for (const v of ["87779233331", "+77779233331", "7779233331", "+7 777 923 33 31", "8 (777) 923-33-31", "7 777 923 33 31"]) {
      expect(toE164(v)).toBe("+77779233331");
    }
  });
  it("первая введенная семерка после префикса +7 не теряется", () => {
    expect(nationalDigits("+7 7")).toBe("7");
    expect(nationalDigits("+7 777")).toBe("777");
  });
  it("валидация: нужно ровно 10 цифр", () => {
    expect(isValidPhone("+7 777 923 33 3")).toBe(false);
    expect(isValidPhone("+7 777 923 33 31")).toBe(true);
    expect(isValidPhone("")).toBe(false);
  });
  it("удаление разделителя стирает цифру, а не зацикливается", () => {
    expect(maskPhoneOnChange("+7 777 923 33 3", "+7 777 923 33 31")).toBe("+7 777 923 33 3");
    expect(maskPhoneOnChange("+7 777 923 33", "+7 777 923 33 3")).toBe("+7 777 923 33");
  });
});
