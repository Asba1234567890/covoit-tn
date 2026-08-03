import { PrismaClient } from "@prisma/client";
import { initialCountries, defaultPlatformSettings } from "../config/countries";

const prisma = new PrismaClient();

async function main() {
  for (const c of initialCountries) {
    const currency = await prisma.currency.upsert({
      where: { code: c.currency.code },
      update: {},
      create: c.currency,
    });

    const country = await prisma.country.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        currencyId: currency.id,
        defaultLocale: c.defaultLocale,
        supportedLangs: c.supportedLangs,
        emergencyNumbers: c.emergencyNumbers,
      },
    });

    for (const city of c.cities) {
      await prisma.city.upsert({
        where: { id: `${country.id}-${city.name}` }, // placeholder; real app should use a composite unique constraint
        update: {},
        create: { ...city, countryId: country.id },
      }).catch(async () => {
        // fallback: composite lookup not modeled as unique above, so just create if missing
        const exists = await prisma.city.findFirst({ where: { countryId: country.id, name: city.name } });
        if (!exists) await prisma.city.create({ data: { ...city, countryId: country.id } });
      });
    }

    for (const setting of defaultPlatformSettings) {
      await prisma.platformSetting.upsert({
        where: { countryId_key: { countryId: country.id, key: setting.key } },
        update: { value: setting.value },
        create: { countryId: country.id, key: setting.key, value: setting.value },
      });
    }
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
