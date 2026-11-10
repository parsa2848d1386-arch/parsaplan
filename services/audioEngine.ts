import { AmbientSoundType } from '../types';

/**
 * Web Audio API Ambient Sound Synthesizer
 * Supports White, Pink (Paul Kellet), Brown, Ocean waves (LFO), Rain (LFO + droplet pops),
 * Fireplace (brown + crackle pops), and Binaural Focus Beats (14Hz Beta: 200Hz L / 214Hz R).
 */
class FocusAudioEngine {
    private ctx: AudioContext | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
    private gainNode: GainNode | null = null;
    private lfoNode: OscillatorNode | null = null;
    private oscLeft: OscillatorNode | null = null;
    private oscRight: OscillatorNode | null = null;
    private mergerNode: ChannelMergerNode | null = null;
    private crackleInterval: ReturnType<typeof setInterval> | null = null;
    private currentType: AmbientSoundType = 'none';

    init() {
        if (typeof window === 'undefined') return;
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                this.ctx = new AudioCtx();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    stop() {
        if (this.sourceNode) {
            try { this.sourceNode.stop(); } catch {}
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.lfoNode) {
            try { this.lfoNode.stop(); } catch {}
            this.lfoNode.disconnect();
            this.lfoNode = null;
        }
        if (this.oscLeft) {
            try { this.oscLeft.stop(); } catch {}
            this.oscLeft.disconnect();
            this.oscLeft = null;
        }
        if (this.oscRight) {
            try { this.oscRight.stop(); } catch {}
            this.oscRight.disconnect();
            this.oscRight = null;
        }
        if (this.mergerNode) {
            this.mergerNode.disconnect();
            this.mergerNode = null;
        }
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        if (this.crackleInterval) {
            clearInterval(this.crackleInterval);
            this.crackleInterval = null;
        }
        this.currentType = 'none';
    }

    setVolume(value: number) {
        if (this.gainNode && this.ctx) {
            const clamped = Math.max(0, Math.min(1, value));
            this.gainNode.gain.setValueAtTime(
                this.currentType === 'binaural' ? clamped * 0.25 : clamped,
                this.ctx.currentTime
            );
        }
    }

    playNoise(type: AmbientSoundType, volume: number) {
        this.stop();
        if (type === 'none') return;

        this.init();
        if (!this.ctx) return;
        this.currentType = type;

        this.gainNode = this.ctx.createGain();
        const clampedVol = Math.max(0, Math.min(1, volume));
        this.gainNode.gain.setValueAtTime(
            type === 'binaural' ? clampedVol * 0.25 : clampedVol,
            this.ctx.currentTime
        );
        this.gainNode.connect(this.ctx.destination);

        if (type === 'binaural') {
            this.mergerNode = this.ctx.createChannelMerger(2);
            this.oscLeft = this.ctx.createOscillator();
            this.oscRight = this.ctx.createOscillator();

            this.oscLeft.type = 'sine';
            this.oscRight.type = 'sine';
            this.oscLeft.frequency.setValueAtTime(200, this.ctx.currentTime);
            this.oscRight.frequency.setValueAtTime(214, this.ctx.currentTime); // 14Hz Beta focus beat

            this.oscLeft.connect(this.mergerNode, 0, 0);
            this.oscRight.connect(this.mergerNode, 0, 1);
            this.mergerNode.connect(this.gainNode);

            this.oscLeft.start();
            this.oscRight.start();
            return;
        }

        const sampleRate = this.ctx.sampleRate;
        const bufferSize = 2 * sampleRate;
        const buffer = this.ctx.createBuffer(1, bufferSize, sampleRate);
        const data = buffer.getChannelData(0);

        if (type === 'white') {
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
        } else if (type === 'pink') {
            let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                b0 = 0.99886 * b0 + white * 0.0555179;
                b1 = 0.99332 * b1 + white * 0.0750759;
                b2 = 0.96900 * b2 + white * 0.1538520;
                b3 = 0.86650 * b3 + white * 0.3104856;
                b4 = 0.55000 * b4 + white * 0.5329522;
                b5 = -0.7616 * b5 - white * 0.0168980;
                data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
                b6 = white * 0.115926;
            }
        } else {
            // brown, ocean, rain, fireplace
            let lastOut = 0.0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                data[i] = (lastOut + 0.02 * white) / 1.02;
                lastOut = data[i];
                data[i] *= 3.5;
            }
        }

        this.sourceNode = this.ctx.createBufferSource();
        this.sourceNode.buffer = buffer;
        this.sourceNode.loop = true;

        if (type === 'ocean' || type === 'rain') {
            const waveGain = this.ctx.createGain();
            waveGain.gain.setValueAtTime(type === 'rain' ? 0.65 : 0.4, this.ctx.currentTime);

            this.lfoNode = this.ctx.createOscillator();
            this.lfoNode.type = 'sine';
            this.lfoNode.frequency.setValueAtTime(type === 'rain' ? 0.22 : 0.08, this.ctx.currentTime);

            const lfoGain = this.ctx.createGain();
            lfoGain.gain.setValueAtTime(type === 'rain' ? 0.15 : 0.3, this.ctx.currentTime);

            this.lfoNode.connect(lfoGain);
            lfoGain.connect(waveGain.gain);

            this.sourceNode.connect(waveGain);
            waveGain.connect(this.gainNode);
            this.lfoNode.start();

            if (type === 'rain') {
                this.crackleInterval = setInterval(() => {
                    if (Math.random() > 0.35) {
                        this.playPopSound(0.004, 0.018, 2200, 0.03);
                    }
                }, 70);
            }
        } else if (type === 'fireplace') {
            this.sourceNode.connect(this.gainNode);
            this.crackleInterval = setInterval(() => {
                const rand = Math.random();
                if (rand > 0.88) {
                    this.playPopSound(0.003, 0.015, 1100, 0.16);
                } else if (rand > 0.55) {
                    this.playPopSound(0.001, 0.006, 2800, 0.05);
                }
            }, 100);
        } else {
            this.sourceNode.connect(this.gainNode);
        }

        this.sourceNode.start();
    }

    private playPopSound(attack: number, decay: number, freq: number, popVol: number) {
        if (!this.ctx || this.ctx.state === 'suspended') return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq + (Math.random() * 500 - 250), this.ctx.currentTime);
            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(popVol * (this.gainNode?.gain.value || 0.5), this.ctx.currentTime + attack);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + attack + decay);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + attack + decay + 0.04);
        } catch {}
    }

    playBeep() {
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.6);
        } catch {}
    }
}

export const focusAudioEngine = new FocusAudioEngine();
