// scripts/escape-bq-key.js
// Uso:
//   node scripts/escape-bq-key.js ./key.json
//
// Saída:
//  - BQ_PRIVATE_KEY_escaped  (para a env BQ_PRIVATE_KEY no Vercel)
//  - GOOGLE_APPLICATION_CREDENTIALS_JSON_escaped (opcional: JSON inteiro com \n)

const fs = require("fs");
const path = process.argv[2];

if (!path) {
  console.error("Informe o caminho do key.json. Ex: node scripts/escape-bq-key.js ./key.json");
  process.exit(1);
}

const raw = fs.readFileSync(path, "utf8");
const json = JSON.parse(raw);

if (!json.private_key || !json.client_email || !json.project_id) {
  console.error("JSON inválido: certifique-se de que é o service-account (tem fields private_key, client_email, project_id).");
  process.exit(1);
}

// 1) Só a private_key com \n literais (para BQ_PRIVATE_KEY)
const privateKeyEscaped = json.private_key.replace(/\r?\n/g, "\\n");

// 2) (Opcional) JSON inteiro com \n escapado — útil se quiser usar 1 env só
//    e ler com JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
const fullJsonEscaped = JSON.stringify(json)
  .replace(/\\\\n/g, "\\n"); // garante \n “simples” dentro da string

console.log("\n=== Cole no Vercel (Environment Variable) ===\n");
console.log("BQ_PRIVATE_KEY  ->");
console.log(privateKeyEscaped);

console.log("\n(OPTIONAL) GOOGLE_APPLICATION_CREDENTIALS_JSON ->");
console.log(fullJsonEscaped);
console.log("\nPronto! ✅\n");
