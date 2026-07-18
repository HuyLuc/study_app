export const CLOCK_STYLE_OPTIONS = [
  {
    id: "halo",
    label: "Halo Ring",
    description: "Vòng tiến trình bao quanh thời gian còn lại.",
  },
  {
    id: "split",
    label: "Split Flip",
    description: "Hiển thị tách phút và giây theo khối lớn.",
  },
  {
    id: "zen",
    label: "Zen Minimal",
    description: "Phong cách tối giản, tập trung vào 1 nhịp đếm.",
  },
];

export const AMBIENT_TRACK_OPTIONS = [
  {
    id: "none",
    label: "Không phát nhạc",
    url: "",
  },
  {
    id: "focus_piano",
    label: "Piano Focus",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "deep_flow",
    label: "Deep Flow",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "calm_strings",
    label: "Calm Strings",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
];

export function findAmbientTrack(trackId) {
  return AMBIENT_TRACK_OPTIONS.find((item) => item.id === trackId) || AMBIENT_TRACK_OPTIONS[0];
}

