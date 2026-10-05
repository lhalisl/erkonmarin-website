import type { Lang } from '../i18n';

// Erkon Marin's own About copy (Turkish, used verbatim) and its English
// translation, for /hakkimizda/, /en/about/ and the home page's about block.

export const about: Record<
  Lang,
  {
    lead: string;
    brands: string[];
    systems: string[];
    today: string[];
    mission: { before: string; emphasis: string; after: string; more: string };
  }
> = {
  tr: {
    lead: 'Erkon Marin olarak, 35 yılı aşkın denizcilik elektroniği, seyir cihazları ve gemi otomasyon sistemleri deneyimimizi ticari gemilere ve romorkörlere profesyonel çözümler sunmak için kullanıyoruz.',
    brands: ['Raytheon', 'Kelvin Hughes', 'Sperry', 'Decca', 'Furuno', 'Sailor', 'JRC', 'Gylot'],
    systems: ['Elektrik', 'Elektronik', 'Hidrolik', 'Pnömatik', 'Otomasyon'],
    today: [
      'Denizcilik elektrik & elektronik sistemleri tamiri',
      'Radar, gyro, autopilot, VHF ve diğer seyir cihazlarının bakımı',
      'Gemi elektrik arızaları ve otomasyon sistemleri çözümü',
      'Romorkör ve ticari gemilere teknik destek',
      'Klima (HVAC), yazılım ve diğer gemi sistemlerinde uzman müdahale',
      'Gemide mevcut elektrik-elektronik şemalar ve yedek parçalar doğrultusunda hızlı servis',
    ],
    mission: {
      before: 'Erkon Marin’in misyonu, 35 yıllık saha deneyimiyle',
      emphasis: 'hızlı, doğru ve kaliteli',
      after: 'denizcilik teknik hizmeti sunmaktır.',
      more: 'İster ticari gemi, ister romorkör, ister kıyı operasyon araçları olsun; her bir gemi için güvenilir, profesyonel ve uzun ömürlü çözümler üretiyoruz.',
    },
  },
  en: {
    lead: 'At Erkon Marin, we put more than 35 years of experience in marine electronics, navigation equipment and ship automation systems to work, delivering professional solutions for merchant vessels and tugboats.',
    brands: ['Raytheon', 'Kelvin Hughes', 'Sperry', 'Decca', 'Furuno', 'Sailor', 'JRC', 'Gylot'],
    systems: ['Electrical', 'Electronic', 'Hydraulic', 'Pneumatic', 'Automation'],
    today: [
      'Repair of marine electrical & electronic systems',
      'Maintenance of radar, gyro, autopilot, VHF and other navigation equipment',
      'Troubleshooting of ship electrical faults and automation systems',
      'Technical support for tugboats and merchant vessels',
      'Expert work on air conditioning (HVAC), software and other shipboard systems',
      'Fast service based on the electrical-electronic drawings and spare parts available on board',
    ],
    mission: {
      before: 'Erkon Marin’s mission is to deliver',
      emphasis: 'fast, accurate and high-quality',
      after: 'marine technical services, backed by 35 years of field experience.',
      more: 'Whether it is a merchant ship, a tug or a coastal operations vessel, we build reliable, professional and long-lasting solutions for every ship.',
    },
  },
};
