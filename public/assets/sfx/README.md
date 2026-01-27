# Audio Assets cho Lì Xì May Mắn

Thư mục này chứa các file âm thanh cho game.

## Danh sách file cần có:

### 1. **click.mp3** (~50KB)
- Âm thanh click khi bấm nút
- Duration: 0.1-0.2s
- Volume: 0.4

### 2. **whoosh.mp3** (~80KB)
- Âm thanh khi bắt đầu quay
- Duration: 0.3-0.5s
- Volume: 0.4
- Gợi ý: sound effect "whoosh" hoặc "swipe"

### 3. **spin_loop.mp3** (~150KB)
- Loop nhẹ trong lúc quay
- Duration: 2-3s (loop)
- Volume: 0.25
- Gợi ý: ambient spinning sound, nhẹ nhàng

### 4. **win_jingle.mp3** (~200KB)
- Jingle vui khi thắng
- Duration: 1-2s
- Volume: 0.7
- Gợi ý: festive jingle, celebration sound

### 5. **reveal_ting.mp3** (~60KB)
- Tiếng "ting" khi reveal kết quả
- Duration: 0.2-0.4s
- Volume: 0.5
- Gợi ý: bell/chime sound

### 6. **fail_bop.mp3** (~50KB)
- Âm thanh nhẹ khi không trúng
- Duration: 0.2-0.3s
- Volume: 0.3
- Gợi ý: soft "bop" hoặc "plop"

### 7. **scratch.mp3** (~40KB)
- Âm thanh khi gãi thẻ
- Duration: 0.1-0.2s
- Volume: 0.3
- Rate: 1.2x (slightly faster)
- Gợi ý: scratch/rub sound

### 8. **confetti_pop.mp3** (~100KB)
- Âm thanh khi confetti nổ
- Duration: 0.3-0.5s
- Volume: 0.6
- Gợi ý: pop/explosion sound

### 9. **short_fanfare.mp3** (~150KB)
- Fanfare ngắn khi hoàn thành scratch
- Duration: 0.5-1s
- Volume: 0.7
- Gợi ý: short celebration fanfare

### 10. **pop.mp3** (~30KB)
- Âm thanh pop nhẹ (optional, cho next round)
- Duration: 0.1-0.2s
- Volume: 0.4
- Gợi ý: soft pop sound

## Nguồn tài nguyên miễn phí:

- **Freesound.org**: https://freesound.org
- **Zapsplat**: https://www.zapsplat.com
- **Mixkit**: https://mixkit.co/free-sound-effects/
- **Pixabay**: https://pixabay.com/music/

## Lưu ý:

1. **Định dạng**: MP3 (hoặc OGG cho web tốt hơn, nhưng cần fallback MP3)
2. **Bitrate**: 128kbps là đủ cho SFX
3. **Sample rate**: 44.1kHz
4. **Tổng dung lượng**: Nên < 800KB cho tất cả file
5. **Tone**: Festive, vui vẻ, không quá chói tai
6. **Mobile-friendly**: Test trên mobile để đảm bảo không lag

## Cách thêm file:

1. Tải các file âm thanh về
2. Đặt vào thư mục `public/assets/sfx/`
3. Đảm bảo tên file khớp với manifest trong `src/utils/audioManifest.ts`
4. Test trên desktop và mobile

## Fallback:

Nếu file không tồn tại, AudioManager sẽ log warning nhưng không crash app. Có thể tạo silent buffer hoặc skip sound đó.
