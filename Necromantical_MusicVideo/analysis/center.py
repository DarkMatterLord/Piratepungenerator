import sys, numpy as np, soundfile as sf, librosa
wav, out = sys.argv[1], sys.argv[2]
y, sr = sf.read(wav)  # stereo 44.1k
L, R = y[:,0], y[:,1]
n=2048; hop=512
SL = librosa.stft(L, n_fft=n, hop_length=hop); SR = librosa.stft(R, n_fft=n, hop_length=hop)
# center-ness: similarity of L and R complex spectra
num = np.abs(SL*np.conj(SR)); den = 0.5*(np.abs(SL)**2+np.abs(SR)**2)+1e-12
coh = num/den  # 1 when identical
# also penalize phase difference
pd = np.cos(np.angle(SL)-np.angle(SR))
mask = np.clip(coh,0,1)**6 * np.clip(pd,0,1)**4
M = 0.5*(SL+SR)*mask
freqs = librosa.fft_frequencies(sr=sr, n_fft=n)
M[(freqs<180)|(freqs>6000)] = 0
yc = librosa.istft(M, hop_length=hop, length=len(L))
yc = librosa.resample(yc, orig_sr=sr, target_sr=16000)
yc = yc/np.max(np.abs(yc))*0.9
sf.write(out, yc, 16000, subtype='PCM_16')
print("wrote", out)
