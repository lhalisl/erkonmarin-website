import { photos, type Photo } from './photos';

// "Neler Yapıyoruz?" — the four service areas. Paragraph copy is supplied by
// Erkon Marin and is used verbatim; the first paragraph doubles as the summary
// on the home page timeline.

export interface Service {
  slug: string;
  title: string;
  /** English name, as it appears on the old site */
  subtitle: string;
  paragraphs: string[];
  photo: Photo;
}

export const services: Service[] = [
  {
    slug: 'ana-makine',
    title: 'Ana Makine',
    subtitle: 'Main Engine',
    paragraphs: [
      'Sulzer, Mak, Hyundai, Yamaha, Caterpillar, MTU gibi dünyanın önde gelen deniz motoru markalarının Ana Makine Sistemleri için arıza tespiti, bakım, onarım ve montaj hizmetlerini, 35 yılı aşkın tecrübemizle profesyonel şekilde gerçekleştirmekteyiz.',
      'Gerek ticari gemilerde, gerek romorkörlerde, gerekse diğer tüm yüzer araçlarda; ana makine sistemlerinin güvenli ve verimli çalışması için gerekli tüm teknik müdahaleleri uygulayabilmekteyiz.',
      'Gemide malzeme, yedek parça ve elektrik-elektronik şemalarının bulunması halinde arıza çözüm sürecimiz çok daha hızlı, etkili ve uzun ömürlü sonuçlar ortaya çıkarmaktadır.',
    ],
    photo: photos.kontrolOdasi,
  },
  {
    slug: 'yardimci-makine',
    title: 'Yardımcı Makine',
    subtitle: 'AUX Engine / D/G',
    paragraphs: [
      'Volvo Penta, Scania ve Dorman jeneratörlerin tüm elektrik, elektronik ve otomasyon sistemlerinin arıza tespiti, bakım ve onarımı; mevcut imkanlar ve gemideki teknik dokümanlar doğrultusunda tarafımızdan profesyonel olarak gerçekleştirilmektedir.',
      'Denizcilik sektöründe edindiğimiz 35 yıllık teknik tecrübe ile, jeneratör sistemlerinin güvenli, kararlı ve verimli şekilde çalışması için gerekli tüm müdahaleleri hızlı ve etkin çözümlerle sunmaktayız.',
      'Gemide elektrik şemalarının, otomasyon diyagramlarının ve ilgili yedek parçaların temin edilmesi, servis sürecinin daha kısa sürede ve doğru şekilde tamamlanmasını sağlamaktadır.',
    ],
    photo: photos.jenerator,
  },
  {
    slug: 'seyir-sistemleri',
    title: 'Seyir Sistemleri',
    // confirm: no English name was supplied for this one
    subtitle: 'Navigation Systems',
    paragraphs: [
      'Köprü üstü seyir sistemlerinde, 35 yılı aşan sektör tecrübemizle; tamir, montaj, arıza tespiti ve demontaj işlemlerini profesyonel şekilde gerçekleştirmekteyiz.',
      'Radar, gyro, autopilot, ekolot, VHF, AIS ve diğer tüm köprüüstü seyir cihazlarının güvenli ve kesintisiz çalışması için gerekli teknik müdahaleleri uzman ekibimizle hızlı ve doğru şekilde uyguluyoruz.',
      'Denizcilik elektroniği alanındaki uzun yıllara dayanan tecrübemiz sayesinde, hem ticari gemilerde hem de romorkörlerde köprü üstü navigasyon sistemlerinin bakım ve onarım süreçlerini en verimli şekilde yönetebilmekteyiz.',
      'Gemide ilgili şemaların, belgelerin ve yedek parçaların bulunması, arıza çözüm hızımızı ve hizmet kalitemizi önemli ölçüde artırmaktadır.',
    ],
    photo: photos.koprustu,
  },
  {
    slug: 'romorkor-ve-sar-botlar',
    title: 'Romorkör ve SAR Botlar',
    subtitle: 'TUG & Search and Rescue Boats',
    paragraphs: [
      'Türkiye’nin en büyük Romorkör ve SAR Boat filosuna sahip kamu kurumu olan Kıyı Emniyeti Genel Müdürlüğü’nde edindiğimiz 22 yıllık saha tecrübesi sayesinde, çok geniş bir teknik yelpazede arızalara müdahale edebilmekte ve onarımlarını profesyonel şekilde gerçekleştirebilmekteyiz.',
      'Romorkörlerin, SAR Boat’ların ve tüm kıyı emniyeti araçlarının elektrik, elektronik, hidrolik, pnömatik, otomasyon ve makine sistemleri üzerinde uzmanlaşmış ekibimiz; arıza tespiti, bakım ve onarım süreçlerini hızlı, güvenilir ve uzun ömürlü çözümlerle yönetmektedir.',
      'Denizcilik sektöründeki köklü deneyimimiz sayesinde, hem acil müdahalelerde hem de planlı teknik bakım süreçlerinde yüksek kalite standardı sunarak gemi operasyonlarının kesintisiz devam etmesini sağlıyoruz.',
    ],
    photo: photos.gemi,
  },
];

export const serviceHref = (s: Pick<Service, 'slug'>) => `/hizmetler/${s.slug}/`;
