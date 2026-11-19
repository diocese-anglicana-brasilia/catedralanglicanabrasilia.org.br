import test from "node:test";
import assert from "node:assert/strict";
import { ageOnDate, dateInBrasilia } from "../src/utils/person-age.mjs";

test("calcula idade antes e no aniversário e não aceita datas invertidas", () => {
  assert.equal(ageOnDate("1981-03-01", "2026-02-28"), 44);
  assert.equal(ageOnDate("1981-03-01", "2026-03-01"), 45);
  assert.equal(ageOnDate("1981-03-01", "1980-12-31"), null);
  assert.equal(ageOnDate("1950-05-23", "2020-06-13"), 70);
});

test("usa o calendário de Brasília para atualizar a idade", () => {
  assert.equal(dateInBrasilia(new Date("2026-03-01T02:30:00Z")), "2026-02-28");
  assert.equal(dateInBrasilia(new Date("2026-03-01T03:00:00Z")), "2026-03-01");
});
