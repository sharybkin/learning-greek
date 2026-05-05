// js/speech.js — Speech synthesis module
window.Speech = (function () {
    let greekVoice = null;
    let audioKeepAliveInterval = null;

    // Get the Greek voice, caching it for future use.
    // Voices are loaded asynchronously, so we need to wait for them.
    function getGreekVoice(callback) {
        if (greekVoice) {
            return callback(greekVoice);
        }

        const setVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            greekVoice = voices.find(v => v.lang === 'el-GR');
            if (greekVoice) {
                // Pre-warm the audio system with a silent utterance
                const warmup = new SpeechSynthesisUtterance(' ');
                warmup.lang = 'el-GR';
                warmup.voice = greekVoice;
                warmup.volume = 0;
                window.speechSynthesis.speak(warmup);
                callback(greekVoice);
            } else {
                console.warn("Greek voice not found, falling back to default.");
                callback(null);
            }
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            setVoice();
        } else {
            window.speechSynthesis.onvoiceschanged = setVoice;
        }
    }

    function speak(text) {
        getGreekVoice(voice => {
            // Cancel any ongoing speech to prevent queue buildup
            window.speechSynthesis.cancel();

            // Prime the audio system with a very short silent utterance
            const primer = new SpeechSynthesisUtterance(' ');
            primer.lang = 'el-GR';
            if (voice) {
                primer.voice = voice;
            }
            primer.volume = 0;
            primer.rate = 10; // Very fast to minimize delay

            // Speak the actual text after priming
            primer.onend = () => {
                // Remove verb type annotations like (1), (2), (2.1) before pronunciation
                const cleanText = text.replace(/\s*\([\d.]+\)\s*/g, '').trim();
                const utterance = new SpeechSynthesisUtterance(cleanText);
                utterance.lang = 'el-GR';
                if (voice) {
                    utterance.voice = voice;
                }

                // Add error handling
                utterance.onerror = (event) => {
                    console.warn('Speech synthesis error:', event);
                    // Retry once on error
                    setTimeout(() => {
                        window.speechSynthesis.speak(utterance);
                    }, 100);
                };

                window.speechSynthesis.speak(utterance);
            };

            window.speechSynthesis.speak(primer);
        });
    }

    // Start audio keep-alive to prevent stuttering on mobile/Bluetooth devices
    function startKeepAlive() {
        stopKeepAlive();

        audioKeepAliveInterval = setInterval(() => {
            getGreekVoice(voice => {
                const keepAlive = new SpeechSynthesisUtterance(' ');
                keepAlive.lang = 'el-GR';
                if (voice) {
                    keepAlive.voice = voice;
                }
                keepAlive.volume = 0;
                window.speechSynthesis.speak(keepAlive);
            });
        }, 4000);
    }

    function stopKeepAlive() {
        if (audioKeepAliveInterval) {
            clearInterval(audioKeepAliveInterval);
            audioKeepAliveInterval = null;
        }
    }

    return {
        getGreekVoice,
        speak,
        startKeepAlive,
        stopKeepAlive
    };
})();
