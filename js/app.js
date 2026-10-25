function generateQR() {

    const text = document.getElementById('qrInput').value.trim();

    const size = Number(
        document.getElementById('qrSize').value
    );

    const darkColor =
        document.getElementById('darkColor').value;

    const lightColor =
        document.getElementById('lightColor').value;

    const qrContainer =
        document.getElementById('qrcode');

    qrContainer.innerHTML = '';

    if (!text) {
        alert('Введіть текст або URL');
        return;
    }

    new QRCode(qrContainer, {
        text: text,
        width: size,
        height: size,
        colorDark: darkColor,
        colorLight: lightColor,
        correctLevel: QRCode.CorrectLevel.H
    });
}

function downloadQR() {

    const canvas =
        document.querySelector('#qrcode canvas');

    if (!canvas) {
        alert('Спочатку згенеруйте QR-код');
        return;
    }

    const link =
        document.createElement('a');

    link.href =
        canvas.toDataURL('image/png');

    link.download =
        'qr-code.png';

    link.click();
}