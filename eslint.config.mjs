import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  /**
   * Vitrinde her <Link> önyüklemeyi AÇIKÇA belirtir (13 Kas 2026).
   *
   * Vitrin sayfaları dinamik (istek başı nonce'lu CSP). <Link>'in kendiliğinden
   * önyüklemesi görünür her bağlantı için ayrı bir sunucu çağrısı + ara katman
   * çağrısı demek; tek ana sayfa açılışında 7 arka plan sayfa kurulumu
   * ölçüldü. Vercel'in ücretsiz aylık sunucu süresi (4 saat) buna dayanmıyor.
   * Ürün kartı imleç/dokunuşta kendisi önyükler (ProductCardV2). Ayrıntı:
   * docs/vercel-ucretsiz-sinir.md.
   */
  {
    files: ["src/components/**/*.tsx", "src/app/(store)/**/*.tsx", "src/app/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "JSXOpeningElement[name.name='Link']:not(:has(JSXAttribute[name.name='prefetch']))",
          message:
            "Vitrinde <Link> önyüklemeyi açıkça belirtmeli (genelde prefetch={false}): her önyükleme bir sunucu çağrısı. Bkz. docs/vercel-ucretsiz-sinir.md",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
