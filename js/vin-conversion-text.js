// VIN Decoder Conversion Text Rotator
document.addEventListener('DOMContentLoaded', function() {
    const conversionTexts = [
        {
            message: "Our service goes beyond basic vehicle history and helps identify <strong>insurance fraud risks</strong>. The most common schemes include <strong>odometer rollback</strong>, staged accidents, multiple insurance payouts, rebuilt total-loss vehicles, and <strong>VIN cloning</strong>. These issues are often hidden from buyers.",
            cta: "Check the vehicle before you buy"
        },
        {
            message: "A car can look clean on paper and still be tied to <strong>insurance fraud</strong>. We analyze patterns linked to <strong>total-loss laundering</strong>, duplicate insurance claims, false accident reports, <strong>mileage manipulation</strong>, and VIN swaps. This is what standard reports often miss.",
            cta: "Get the full vehicle report"
        },
        {
            message: "We don't just show records — we flag <strong>suspicious insurance activity</strong>. The most frequent fraud schemes include <strong>salvage title washing</strong>, repeated insurance claims, fake theft reports, rolled-back mileage, and <strong>VIN cloning</strong>. These vehicles are commonly resold as \"problem-free.\"",
            cta: "Run a VIN check now"
        },
        {
            message: "Even without obvious red flags, a used car may be connected to <strong>insurance fraud</strong>. Typical schemes include staged crashes, multiple payouts for the same damage, <strong>undisclosed total losses</strong>, <strong>odometer fraud</strong>, and altered VIN numbers. Our check helps reveal these risks early.",
            cta: "Protect yourself before the deal"
        },
        {
            message: "Buying used always carries risk — especially when <strong>insurance fraud</strong> is involved. The most common cases are <strong>odometer rollback</strong>, duplicate insurance claims, <strong>hidden total-loss history</strong>, false accident records, and VIN manipulation. A quick check can save you thousands.",
            cta: "Get your vehicle report"
        }
    ];

    const messageElement = document.querySelector('.conversion-message');
    const ctaElement = document.querySelector('.conversion-cta');
    
    if (!messageElement || !ctaElement) return;

    let currentIndex = 0;

    function updateText() {
        // Fade out
        messageElement.style.opacity = '0';
        ctaElement.style.opacity = '0';

        setTimeout(() => {
            // Update content
            const current = conversionTexts[currentIndex];
            messageElement.innerHTML = current.message;
            ctaElement.textContent = current.cta;

            // Fade in
            messageElement.style.opacity = '1';
            ctaElement.style.opacity = '1';

            // Move to next text
            currentIndex = (currentIndex + 1) % conversionTexts.length;
        }, 500);
    }

    // Add transition styles
    messageElement.style.transition = 'opacity 0.5s ease';
    ctaElement.style.transition = 'opacity 0.5s ease';

    // Initialize with first text
    updateText();

    // Rotate every 8 seconds
    setInterval(updateText, 8000);
});

