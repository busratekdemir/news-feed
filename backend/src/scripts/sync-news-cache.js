require("dotenv").config();

const { syncNewsCache } = require("../services/news.service");

async function main() {
  const force = process.argv.includes("--force");
  const result = await syncNewsCache({ force });

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    setTimeout(() => process.exit(process.exitCode || 0), 0);
  });
