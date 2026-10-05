import type { Lang } from '../i18n';
import { photos, type Photo } from './photos';

// The four service areas. The Turkish copy is supplied by Erkon Marin and used
// verbatim; the English is a translation of it. Each language shows its own name
// as the title and the other language's name as the subtitle.

export interface ServiceCopy {
  title: string;
  subtitle: string;
  paragraphs: string[];
}

export interface Service {
  key: string;
  slug: Record<Lang, string>;
  tr: ServiceCopy;
  en: ServiceCopy;
  photo: Photo;
}

export const services: Service[] = [
  {
    key: 'ana-makine',
    slug: { tr: 'ana-makine', en: 'main-engine' },
    tr: {
      title: 'Ana Makine',
      subtitle: 'Main Engine',
      paragraphs: [
        'Sulzer, Mak, Hyundai, Yamaha, Caterpillar, MTU gibi dünyanın önde gelen deniz motoru markalarının Ana Makine Sistemleri için arıza tespiti, bakım, onarım ve montaj hizmetlerini, 35 yılı aşkın tecrübemizle profesyonel şekilde gerçekleştirmekteyiz.',
        'Gerek ticari gemilerde, gerek romorkörlerde, gerekse diğer tüm yüzer araçlarda; ana makine sistemlerinin güvenli ve verimli çalışması için gerekli tüm teknik müdahaleleri uygulayabilmekteyiz.',
        'Gemide malzeme, yedek parça ve elektrik-elektronik şemalarının bulunması halinde arıza çözüm sürecimiz çok daha hızlı, etkili ve uzun ömürlü sonuçlar ortaya çıkarmaktadır.',
      ],
    },
    en: {
      title: 'Main Engine',
      subtitle: 'Ana Makine',
      paragraphs: [
        'Drawing on more than 35 years of experience, we professionally carry out fault diagnosis, maintenance, repair and installation on the main engine systems of the world’s leading marine engine makers, including Sulzer, MaK, Hyundai, Yamaha, Caterpillar and MTU.',
        'Whether on merchant vessels, tugboats or any other floating craft, we can carry out every technical intervention needed to keep main engine systems running safely and efficiently.',
        'When materials, spare parts and electrical-electronic drawings are available on board, our troubleshooting is much faster and more effective, and the results last longer.',
      ],
    },
    photo: photos.kontrolOdasi,
  },
  {
    key: 'yardimci-makine',
    slug: { tr: 'yardimci-makine', en: 'auxiliary-engine' },
    tr: {
      title: 'Yardımcı Makine',
      subtitle: 'Aux Engine / D/G',
      paragraphs: [
        'Volvo Penta, Scania ve Dorman jeneratörlerin tüm elektrik, elektronik ve otomasyon sistemlerinin arıza tespiti, bakım ve onarımı; mevcut imkanlar ve gemideki teknik dokümanlar doğrultusunda tarafımızdan profesyonel olarak gerçekleştirilmektedir.',
        'Denizcilik sektöründe edindiğimiz 35 yıllık teknik tecrübe ile, jeneratör sistemlerinin güvenli, kararlı ve verimli şekilde çalışması için gerekli tüm müdahaleleri hızlı ve etkin çözümlerle sunmaktayız.',
        'Gemide elektrik şemalarının, otomasyon diyagramlarının ve ilgili yedek parçaların temin edilmesi, servis sürecinin daha kısa sürede ve doğru şekilde tamamlanmasını sağlamaktadır.',
      ],
    },
    en: {
      title: 'Auxiliary Engine / D/G',
      subtitle: 'Yardımcı Makine',
      paragraphs: [
        'We professionally carry out fault diagnosis, maintenance and repair of all electrical, electronic and automation systems on Volvo Penta, Scania and Dorman generators, working with the means available and the technical documentation on board.',
        'With 35 years of technical experience in the maritime sector, we provide every intervention needed to keep generator systems running safely, stably and efficiently, with fast and effective solutions.',
        'Having the electrical drawings, automation diagrams and relevant spare parts available on board allows the service to be completed sooner and correctly.',
      ],
    },
    photo: photos.jenerator,
  },
  {
    key: 'seyir-sistemleri',
    slug: { tr: 'seyir-sistemleri', en: 'navigation-systems' },
    tr: {
      title: 'Seyir Sistemleri',
      // confirm: no English name was supplied for this one
      subtitle: 'Navigation Systems',
      paragraphs: [
        'Köprü üstü seyir sistemlerinde, 35 yılı aşan sektör tecrübemizle; tamir, montaj, arıza tespiti ve demontaj işlemlerini profesyonel şekilde gerçekleştirmekteyiz.',
        'Radar, gyro, autopilot, ekolot, VHF, AIS ve diğer tüm köprüüstü seyir cihazlarının güvenli ve kesintisiz çalışması için gerekli teknik müdahaleleri uzman ekibimizle hızlı ve doğru şekilde uyguluyoruz.',
        'Denizcilik elektroniği alanındaki uzun yıllara dayanan tecrübemiz sayesinde, hem ticari gemilerde hem de romorkörlerde köprü üstü navigasyon sistemlerinin bakım ve onarım süreçlerini en verimli şekilde yönetebilmekteyiz.',
        'Gemide ilgili şemaların, belgelerin ve yedek parçaların bulunması, arıza çözüm hızımızı ve hizmet kalitemizi önemli ölçüde artırmaktadır.',
      ],
    },
    en: {
      title: 'Navigation Systems',
      subtitle: 'Seyir Sistemleri',
      paragraphs: [
        'With more than 35 years of experience in the sector, we professionally carry out repair, installation, fault diagnosis and removal work on bridge navigation systems.',
        'Our expert team quickly and correctly applies the technical interventions needed to keep radar, gyro, autopilot, echo sounder, VHF, AIS and all other bridge navigation equipment running safely and without interruption.',
        'Thanks to our many years of experience in marine electronics, we manage the maintenance and repair of bridge navigation systems as efficiently as possible on both merchant vessels and tugboats.',
        'Having the relevant drawings, documents and spare parts on board significantly increases the speed of our troubleshooting and the quality of our service.',
      ],
    },
    photo: photos.koprustu,
  },
  {
    key: 'romorkor-ve-sar-botlar',
    slug: { tr: 'romorkor-ve-sar-botlar', en: 'tugs-and-sar-boats' },
    tr: {
      title: 'Romorkör ve SAR Botlar',
      subtitle: 'TUG & Search and Rescue Boats',
      paragraphs: [
        'Türkiye’nin en büyük Romorkör ve SAR Boat filosuna sahip kamu kurumu olan Kıyı Emniyeti Genel Müdürlüğü’nde edindiğimiz 22 yıllık saha tecrübesi sayesinde, çok geniş bir teknik yelpazede arızalara müdahale edebilmekte ve onarımlarını profesyonel şekilde gerçekleştirebilmekteyiz.',
        'Romorkörlerin, SAR Boat’ların ve tüm kıyı emniyeti araçlarının elektrik, elektronik, hidrolik, pnömatik, otomasyon ve makine sistemleri üzerinde uzmanlaşmış ekibimiz; arıza tespiti, bakım ve onarım süreçlerini hızlı, güvenilir ve uzun ömürlü çözümlerle yönetmektedir.',
        'Denizcilik sektöründeki köklü deneyimimiz sayesinde, hem acil müdahalelerde hem de planlı teknik bakım süreçlerinde yüksek kalite standardı sunarak gemi operasyonlarının kesintisiz devam etmesini sağlıyoruz.',
      ],
    },
    en: {
      title: 'Tugs & Search and Rescue Boats',
      subtitle: 'Romorkör ve SAR Botlar',
      paragraphs: [
        'Thanks to 22 years of field experience at the Directorate General of Coastal Safety, the public institution operating Türkiye’s largest fleet of tugs and SAR boats, we can respond to faults across a very wide technical range and carry out repairs professionally.',
        'Our team, specialised in the electrical, electronic, hydraulic, pneumatic, automation and machinery systems of tugs, SAR boats and all coastal safety vessels, manages fault diagnosis, maintenance and repair with fast, reliable and long-lasting solutions.',
        'Backed by our deep-rooted experience in the maritime sector, we deliver a high quality standard in both emergency response and planned technical maintenance, keeping vessel operations running without interruption.',
      ],
    },
    photo: photos.gemi,
  },
];

export const serviceHref = (s: Pick<Service, 'slug'>, lang: Lang) =>
  lang === 'tr' ? `/hizmetler/${s.slug.tr}/` : `/en/services/${s.slug.en}/`;
