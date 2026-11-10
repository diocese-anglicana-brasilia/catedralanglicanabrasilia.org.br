import { execFileSync } from "node:child_process";
import { expect, test } from "@playwright/test";

test("seleciona somente cenários compatíveis com cada dispositivo", () => {
  const list = (project: string) => execFileSync(process.execPath, [
    "node_modules/@playwright/test/cli.js", "test", "--list", `--project=${project}`,
  ], { encoding: "utf8" });
  const desktop = list("desktop-chromium");
  const mobile = list("mobile-chromium");
  expect(desktop).toContain("alinha os itens principais do menu na mesma linha no desktop");
  expect(desktop).not.toContain("fecha o menu mobile ao pressionar Escape");
  expect(mobile).toContain("fecha o menu mobile ao pressionar Escape");
  expect(mobile).not.toContain("alinha os itens principais do menu na mesma linha no desktop");
  expect(desktop).toContain("permite navegar até a página de contato");
  expect(mobile).toContain("permite navegar até a página de contato");
});
