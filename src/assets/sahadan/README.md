# Sahadan — gerçek proje fotoğrafları

Sitede kullanılan gerçek fotoğrafların orijinalleri (metadata temizlenmiş).
Hangi fotoğrafın nerede, hangi açıklama ve alt metinle göründüğü
`src/data/photos.ts` dosyasında tanımlıdır. Yeni bir fotoğraf eklemek için:

1. Dosyayı bu klasöre koyun (yüksek çözünürlüklü `.jpg` / `.png` / `.webp`).
2. `src/data/photos.ts` içinde içe aktarın, alt metnini ve açıklamasını yazın.
3. `galleryRows` içinde bir satıra ekleyin (aynı satırdaki fotoğraflar aynı yükseklikte gösterilir).

Boyutlandırma ve WebP dönüşümü derleme sırasında yapılır.
