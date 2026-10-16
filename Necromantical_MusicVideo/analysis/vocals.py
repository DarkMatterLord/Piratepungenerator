import sys, json, numpy as np, librosa, librosa.display
import matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
wav, outdir = sys.argv[1], sys.argv[2]
y, sr = librosa.load(wav, sr=22050, mono=True)
hop=256; nfft=2048
S_full, phase = librosa.magphase(librosa.stft(y, n_fft=nfft, hop_length=hop))
# REPET-SIM foreground (vocal) separation
S_filter = librosa.decompose.nn_filter(S_full, aggregate=np.median, metric='cosine',
                                       width=int(librosa.time_to_frames(2, sr=sr, hop_length=hop)))
S_filter = np.minimum(S_full, S_filter)
margin_v = 10; power = 2
mask_v = librosa.util.softmask(S_full - S_filter, margin_v * S_filter, power=power)
S_fg = mask_v * S_full
y_fg = librosa.istft(S_fg * phase, hop_length=hop)
import soundfile as sf
sf.write(outdir+'/vocals_fg.wav', y_fg, sr)
freqs = librosa.fft_frequencies(sr=sr, n_fft=nfft)
band = (freqs>250)&(freqs<3500)
ve = S_fg[band].sum(0)
t = librosa.frames_to_time(np.arange(S_fg.shape[1]), sr=sr, hop_length=hop)
# smooth
k = 9; ve_s = np.convolve(ve, np.ones(k)/k, mode='same')
vdb = 20*np.log10(ve_s+1e-6)
json.dump({"t":t[::2].tolist(),"vdb":vdb[::2].tolist()}, open(outdir+'/vocal_env.json','w'))
dur = len(y)/sr
beats = json.load(open(outdir+'/basic.json'))['beats']
Sdb = librosa.amplitude_to_db(S_fg, ref=np.max)
seg = 24
for i, s0 in enumerate(np.arange(0, dur, seg)):
    s1 = min(dur, s0+seg)
    f0, f1 = librosa.time_to_frames([s0, s1], sr=sr, hop_length=hop)
    fig, ax = plt.subplots(2,1, figsize=(24,8), gridspec_kw={'height_ratios':[3,1]}, sharex=True)
    fmax_bin = np.searchsorted(freqs, 4000)
    ax[0].imshow(Sdb[:fmax_bin, f0:f1], origin='lower', aspect='auto', cmap='magma',
                 extent=[s0, s1, 0, freqs[fmax_bin]], vmin=-70, vmax=0)
    ax[1].plot(t[f0:f1], vdb[f0:f1], lw=0.8)
    for b in beats:
        if s0<=b<=s1: ax[1].axvline(b, color='gray', lw=0.3)
    ax[1].set_xticks(np.arange(np.ceil(s0), s1, 1.0))
    ax[1].grid(axis='x', color='r', lw=0.3)
    ax[0].set_xticks(np.arange(np.ceil(s0), s1, 1.0)); ax[0].grid(axis='x', color='w', lw=0.3, alpha=0.5)
    ax[1].tick_params(labelsize=8)
    plt.tight_layout(); plt.savefig(f'{outdir}/spec_{i:02d}.png', dpi=60); plt.close()
print("done")
