# 🎵 Hướng dẫn Implementation Audio cho Lì Xì May Mắn

## 📋 Tổng quan

Hệ thống audio đã được implement với đầy đủ tính năng:
- ✅ State machine cho các trạng thái âm thanh
- ✅ Unlock audio theo autoplay policy (iOS/Safari/Chrome mobile)
- ✅ Preload audio files
- ✅ Volume control và priority system
- ✅ Throttle cho scratch sound
- ✅ Queue system cho events trước khi unlock
- ✅ Sound toggle với localStorage persistence

## 🏗️ Kiến trúc

### 1. **AudioManager** (`src/utils/AudioManager.ts`)
- Singleton class quản lý toàn bộ audio
- Sử dụng Web Audio API (AudioContext)
- Hỗ trợ fallback cho HTMLAudioElement nếu cần
- Quản lý:
  - AudioContext và GainNode (master volume)
  - Audio buffers (preloaded)
  - Active sounds và loops
  - Unlock state
  - Priority system (tránh chồng âm)

### 2. **AudioContext Provider** (`src/context/AudioContext.tsx`)
- React Context cung cấp `useAudio()` hook
- `AudioProvider` wrap app và initialize AudioManager
- `SoundToggle` component tích hợp sẵn

### 3. **Audio Manifest** (`src/utils/audioManifest.ts`)
- Định nghĩa tất cả audio files và cấu hình
- Volume, priority, loop settings cho từng sound

## 🎮 State Machine Mapping

| State | Event | Audio Action |
|-------|-------|--------------|
| IDLE | - | Không phát |
| SPIN_START | User click "QUAY NGAY!" | `play('whoosh')` + `playLoop('spin_loop')` |
| SPINNING | Đang quay (0-500ms) | Loop `spin_loop` (nhẹ, background) |
| RESULT_REVEAL | Kết quả hiện (500ms sau spin) | `stopLoop('spin_loop')` + `play('win_jingle')` hoặc `play('fail_bop')` + `play('reveal_ting')` |
| SCRATCH_START | User bắt đầu gãi | `play('scratch')` (throttled, max 6 lần/giây) |
| SCRATCH_COMPLETE | Gãi > 85% | `play('confetti_pop')` + `play('short_fanfare')` (nếu thắng) |
| NEXT_ROUND | Reset về idle | `play('pop')` (optional, nhẹ) |

## 📁 Cấu trúc File

```
src/
├── utils/
│   ├── AudioManager.ts       # Core audio manager
│   └── audioManifest.ts      # Audio files manifest
├── context/
│   └── AudioContext.tsx      # React context & provider
└── components/
    └── SlotMachine.tsx        # Tích hợp audio events

public/
└── assets/
    └── sfx/
        ├── click.mp3
        ├── whoosh.mp3
        ├── spin_loop.mp3
        ├── win_jingle.mp3
        ├── reveal_ting.mp3
        ├── fail_bop.mp3
        ├── scratch.mp3
        ├── confetti_pop.mp3
        ├── short_fanfare.mp3
        └── pop.mp3
```

## 🔧 Tích hợp vào App

### 1. Wrap App với AudioProvider

```tsx
// src/App.tsx
import { AudioProvider } from './context/AudioContext';
import { audioManifest } from './utils/audioManifest';

function App() {
  return (
    <UserProvider>
      <AudioProvider manifest={audioManifest}>
        <AppContent />
      </AudioProvider>
    </UserProvider>
  );
}
```

### 2. Sử dụng trong Component

```tsx
import { useAudio, SoundToggle } from '../context/AudioContext';

function MyComponent() {
  const { play, playLoop, stop, stopLoop, unlock } = useAudio();

  const handleSpin = async () => {
    await unlock(); // Unlock audio on user gesture
    play('whoosh');
    playLoop('spin_loop');
    
    setTimeout(() => {
      stopLoop('spin_loop');
      play('win_jingle');
    }, 500);
  };

  return (
    <div>
      <SoundToggle /> {/* Toggle button */}
      <button onClick={handleSpin}>Spin</button>
    </div>
  );
}
```

## 🎯 Tính năng chính

### 1. **Autoplay Unlock**
- AudioContext bắt đầu ở trạng thái `suspended`
- Phải gọi `unlock()` sau user gesture (click/tap)
- Tự động unlock khi user bật Sound toggle
- Queue events nếu chưa unlock, phát ngay khi unlock

### 2. **Priority System**
- Mỗi sound có `priority` (0-3)
- Khi đạt max concurrent sounds (2), sound thấp priority sẽ bị dừng
- Result sounds (win_jingle, confetti_pop) có priority cao (3)

### 3. **Throttle Scratch Sound**
- Scratch sound được throttle: max 6 lần/giây (~166ms)
- Tránh spam khi user gãi nhanh

### 4. **Volume Control**
- Master volume: 0.0 - 1.0 (default: 0.6)
- Per-sound volume override trong manifest
- Lưu vào localStorage

### 5. **Sound Toggle**
- Component `SoundToggle` với icon loa
- Lưu trạng thái vào localStorage
- Default: Off (để tránh autoplay block)

## 📝 Audio Files Checklist

Cần có các file sau trong `public/assets/sfx/`:

- [ ] `click.mp3` (~50KB, 0.1-0.2s)
- [ ] `whoosh.mp3` (~80KB, 0.3-0.5s)
- [ ] `spin_loop.mp3` (~150KB, 2-3s loop)
- [ ] `win_jingle.mp3` (~200KB, 1-2s)
- [ ] `reveal_ting.mp3` (~60KB, 0.2-0.4s)
- [ ] `fail_bop.mp3` (~50KB, 0.2-0.3s)
- [ ] `scratch.mp3` (~40KB, 0.1-0.2s)
- [ ] `confetti_pop.mp3` (~100KB, 0.3-0.5s)
- [ ] `short_fanfare.mp3` (~150KB, 0.5-1s)
- [ ] `pop.mp3` (~30KB, 0.1-0.2s, optional)

**Tổng dung lượng**: < 800KB

Xem `public/assets/sfx/README.md` để biết chi tiết về từng file.

## 🧪 Testing Checklist

### Desktop (Chrome/Firefox/Edge)
- [ ] Sound toggle hoạt động, lưu trạng thái sau refresh
- [ ] Click "QUAY NGAY!" → phát whoosh + spin_loop
- [ ] Kết quả hiện → dừng loop, phát win_jingle/reveal_ting
- [ ] Gãi scratch card → phát scratch (throttled)
- [ ] Gãi xong → phát confetti_pop + short_fanfare
- [ ] Không có lỗi console

### Mobile (iOS Safari / Chrome Android)
- [ ] Lần đầu mở trang: Sound Off (default)
- [ ] Bật Sound → unlock audio, phát được
- [ ] Click "QUAY NGAY!" → phát đúng sounds
- [ ] Gãi scratch → không bị spam, không lag
- [ ] Không có lỗi console
- [ ] Test trên cả WiFi và 4G

### Edge Cases
- [ ] Nếu file audio không tồn tại → log warning, không crash
- [ ] Nếu chưa unlock mà có event → queue lại, phát khi unlock
- [ ] Nếu tắt Sound → dừng tất cả sounds ngay lập tức
- [ ] Nếu refresh trang → giữ nguyên trạng thái Sound On/Off

## 🐛 Troubleshooting

### Audio không phát trên iOS/Safari
- **Nguyên nhân**: Autoplay policy chặn
- **Giải pháp**: Đảm bảo gọi `unlock()` sau user gesture (click/tap)

### Audio bị lag trên mobile
- **Nguyên nhân**: File quá lớn hoặc bitrate cao
- **Giải pháp**: Giảm bitrate xuống 128kbps, optimize file size

### Scratch sound bị spam
- **Nguyên nhân**: Throttle không hoạt động
- **Giải pháp**: Kiểm tra `SCRATCH_THROTTLE_MS` trong AudioManager

### Sounds chồng lên nhau
- **Nguyên nhân**: Priority system không hoạt động
- **Giải pháp**: Kiểm tra `maxConcurrentSounds` và priority trong manifest

## 🚀 Next Steps

1. **Thêm audio files**: Tải các file MP3 vào `public/assets/sfx/`
2. **Test trên mobile**: Đảm bảo hoạt động tốt trên iOS/Android
3. **Tối ưu**: Nếu cần, có thể thêm OGG format cho web tốt hơn
4. **Customize**: Điều chỉnh volume, priority trong `audioManifest.ts`

## 📚 Tài liệu tham khảo

- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Autoplay Policy](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide)
- [AudioContext.resume()](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume)

---

**Lưu ý**: Hiện tại code đã sẵn sàng, chỉ cần thêm các file audio vào `public/assets/sfx/` là có thể sử dụng ngay!
