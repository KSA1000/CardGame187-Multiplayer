// Sound Manager for Card Game 187

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.initialized = false;
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext created, state:', this.audioContext.state);
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
            this.enabled = false;
        }
    }
    
    // تفعيل AudioContext إذا كان معلقاً
    async resumeContext() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            try {
                await this.audioContext.resume();
                console.log('AudioContext resumed, state:', this.audioContext.state);
            } catch (e) {
                console.warn('Failed to resume AudioContext:', e);
            }
        }
    }
    
    // صوت توزيع الورقة
    async playCardDeal() {
        if (!this.enabled || !this.audioContext) return;
        
        await this.resumeContext();
        
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        // نغمة قصيرة وسريعة
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.05);
        
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }
    
    // صوت لعب الورقة
    async playCardPlay() {
        if (!this.enabled || !this.audioContext) return;
        
        await this.resumeContext();
        
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(600, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.08);
        
        gainNode.gain.setValueAtTime(0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        oscillator.start(now);
        oscillator.stop(now + 0.08);
    }
    
    // صوت الفوز بالحيلة
    async playTrickWin() {
        if (!this.enabled || !this.audioContext) return;
        
        await this.resumeContext();
        
        const now = this.audioContext.currentTime;
        
        // نغمة صاعدة
        for (let i = 0; i < 3; i++) {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            const freq = 400 + (i * 100);
            oscillator.frequency.setValueAtTime(freq, now + (i * 0.08));
            
            gainNode.gain.setValueAtTime(0.1, now + (i * 0.08));
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.08) + 0.08);
            
            oscillator.start(now + (i * 0.08));
            oscillator.stop(now + (i * 0.08) + 0.08);
        }
    }
    
    // صوت الفوز بالجولة
    async playRoundWin() {
        if (!this.enabled || !this.audioContext) return;
        
        await this.resumeContext();
        
        const now = this.audioContext.currentTime;
        
        // نغمة احتفالية
        const notes = [523, 659, 784, 1047]; // C, E, G, C
        
        notes.forEach((freq, i) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, now + (i * 0.15));
            
            gainNode.gain.setValueAtTime(0.15, now + (i * 0.15));
            gainNode.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.15) + 0.15);
            
            oscillator.start(now + (i * 0.15));
            oscillator.stop(now + (i * 0.15) + 0.15);
        });
    }
    
    // صوت النقر على الزر
    playButtonClick() {
        if (!this.enabled || !this.audioContext) return;
        
        const now = this.audioContext.currentTime;
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, now);
        
        gainNode.gain.setValueAtTime(0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        
        oscillator.start(now);
        oscillator.stop(now + 0.05);
    }
    
    // تفعيل/تعطيل الأصوات
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }
}

// إنشاء instance عام
const soundManager = new SoundManager();



// دالة اختبار الصوت
soundManager.testSound = async function() {
    console.log('Testing sound...');
    console.log('Enabled:', this.enabled);
    console.log('AudioContext:', this.audioContext);
    console.log('AudioContext state:', this.audioContext ? this.audioContext.state : 'N/A');
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
        console.log('Resuming suspended AudioContext...');
        await this.resumeContext();
    }
    
    console.log('Playing test sound...');
    await this.playCardDeal();
    console.log('Test sound played!');
};

// تفعيل AudioContext عند أول نقرة على الصفحة
document.addEventListener('click', async function initAudio() {
    if (window.soundManager && window.soundManager.audioContext) {
        await window.soundManager.resumeContext();
        console.log('AudioContext activated on user interaction');
    }
}, { once: true });

console.log('Sound Manager initialized!');
console.log('To test sound, run: soundManager.testSound()');

