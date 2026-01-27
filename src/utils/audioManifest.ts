/**
 * Audio Manifest - Danh sách các file âm thanh và cấu hình
 * 
 * Định dạng file: MP3 hoặc OGG (ưu tiên OGG cho web, MP3 fallback)
 * Đường dẫn: /assets/sfx/
 * 
 * Volume levels:
 * - click/whoosh: 0.4 (nhẹ)
 * - spin_loop: 0.25 (rất nhẹ, background)
 * - win_jingle: 0.7 (vui, nổi bật)
 * - reveal_ting: 0.5 (nhẹ)
 * - scratch: 0.3 (nhẹ, rate limited)
 * - confetti_pop: 0.6 (vừa)
 */

import { AudioManifest } from './AudioManager';

export const audioManifest: AudioManifest = {
  // Click/Whoosh sounds
  click: {
    url: '/assets/sfx/click.mp3',
    volume: 0.4,
    priority: 1,
  },
  whoosh: {
    url: '/assets/sfx/whoosh.mp3',
    volume: 0.4,
    priority: 1,
  },

  // Spin loop (background, nhẹ)
  spin_loop: {
    url: '/assets/sfx/spin_loop.mp3',
    volume: 0.25,
    loop: true,
    priority: 0,
  },

  // Win/Result sounds
  win_jingle: {
    url: '/assets/sfx/win_jingle.mp3',
    volume: 0.7,
    priority: 3, // High priority
  },
  reveal_ting: {
    url: '/assets/sfx/reveal_ting.mp3',
    volume: 0.5,
    priority: 2,
  },
  fail_bop: {
    url: '/assets/sfx/fail_bop.mp3',
    volume: 0.3,
    priority: 2,
  },

  // Scratch sounds
  scratch: {
    url: '/assets/sfx/scratch.mp3',
    volume: 0.3,
    priority: 0,
    rate: 1.2, // Slightly faster for responsiveness
  },

  // Completion sounds
  confetti_pop: {
    url: '/assets/sfx/confetti_pop.mp3',
    volume: 0.6,
    priority: 3,
  },
  short_fanfare: {
    url: '/assets/sfx/short_fanfare.mp3',
    volume: 0.7,
    priority: 3,
  },

  // Optional: Next round / Reset
  pop: {
    url: '/assets/sfx/pop.mp3',
    volume: 0.4,
    priority: 1,
  },
};

/**
 * Fallback audio URLs (nếu file không tồn tại, dùng silent buffer hoặc skip)
 * Trong production, nên có đầy đủ file hoặc dùng placeholder
 */
export const getAudioUrl = (name: string): string => {
  return audioManifest[name]?.url || '';
};
