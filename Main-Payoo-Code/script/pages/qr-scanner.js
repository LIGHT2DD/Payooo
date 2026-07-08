import { displaySuccess, displayError, updateBalanceDisplay } from "../dom.js";
import { SessionManager } from "../bankservice.js";

class QRScanner {
  constructor() {
    if (!SessionManager.isAuthenticated()) {
      window.location.href = "../index.html";
      return;
    }

    const session = SessionManager.getSession();
    this.user = session.user;
    this.scanner = null;
    this.init();
  }

  init() {
    updateBalanceDisplay(this.user.balance);

    document.getElementById("start-scan-btn").addEventListener("click", () => {
      this.startScanner();
    });

    document.getElementById("qr-text-input").addEventListener("input", (e) => {
      this.displayResult(e.target.value);
    });
  }

  startScanner() {
    // Check if browser supports camera
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      displayError("Camera not supported in this browser");
      return;
    }

    const qrReader = document.getElementById("qr-reader");

    // Request camera access
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        const video = document.createElement("video");
        video.srcObject = stream;
        video.play();

        qrReader.innerHTML = "";
        qrReader.appendChild(video);

        displaySuccess("Camera started! Scan a QR code");

        // Stop camera after 30 seconds
        setTimeout(() => {
          stream.getTracks().forEach((track) => track.stop());
          qrReader.innerHTML = `
            <div class="text-center">
              <i class="fa-solid fa-qrcode text-6xl text-neutral/30 mb-4"></i>
              <p class="text-neutral/50">Camera timed out</p>
            </div>
          `;
        }, 30000);
      })
      .catch((err) => {
        displayError("Cannot access camera: " + err.message);
      });
  }

  displayResult(text) {
    if (!text) return;

    const resultDiv = document.getElementById("scan-result");
    const resultText = document.getElementById("result-text");

    resultDiv.classList.remove("hidden");
    resultText.textContent = text;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new QRScanner();
});
